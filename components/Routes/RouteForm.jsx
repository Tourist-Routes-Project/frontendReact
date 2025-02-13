import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import "./RouteForm.css";

function RouteForm() {
  const { city } = useParams();
  const [route, setRoute] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [routeInfo, setRouteInfo] = useState({});
  const [coordinates, setCoordinates] = useState([37.3886, -5.9823]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(true);

  useEffect(() => {
    if (!city) return;

    fetch(`http://localhost:8082/api/v1/routes/city/${city}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.length > 0) {
          const routeData = data[0];
          setCheckpoints(routeData.checkpointHasRoute);
          setRouteInfo({
            name: routeData.nameRoute,
            description: routeData.description,
            duration: routeData.duration,
            distance: routeData.distance,
          });

          if (routeData.checkpointHasRoute.length > 0) {
            const firstCheckpoint = routeData.checkpointHasRoute[0];
            setCoordinates([
              firstCheckpoint.coordinates.startLatitude,
              firstCheckpoint.coordinates.startLongitude,
            ]);
          }

          if (routeData.checkpointHasRoute.length > 1) {
            const coordinatesString = routeData.checkpointHasRoute
              .map(
                (checkpoint) =>
                  `${checkpoint.coordinates.startLatitude},${checkpoint.coordinates.startLongitude}`
              )
              .join("&point=");

            fetch(
              `https://graphhopper.com/api/1/route?point=${coordinatesString}&vehicle=foot&key=96f10560-3598-4227-87b7-c77363eb79c3&points_encoded=false&instructions=true`
            )
              .then((response) => response.json())
              .then((data) => {
                if (data.paths && data.paths[0]) {
                  setRoute(data.paths[0].points.coordinates);
                }
              })
              .catch((error) => console.error("Error fetching route:", error));
          }

          // Cargar los comentarios de la ruta
          fetch(
            `http://localhost:8082/api/v1/comment/route/${routeData.idRoute}`
          )
            .then((response) => response.json())
            .then((data) => {
              setComments(data);
              setLoadingComments(false);
            })
            .catch((error) => console.error("Error fetching comments:", error));
        }
      })
      .catch((error) => console.error("Error fetching route data:", error))
      .finally(() => setLoading(false));
  }, [city]);

  const handleAddComment = () => {
    if (newComment.trim() === "") return;

    const commentData = {
      userId: 1,
      routeId: routeInfo.idRoute,
      description: newComment,
      createdDate: new Date().toISOString(),
    };

    fetch(`http://localhost:8082/api/v1/comment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commentData),
    })
      .then((response) => response.json())
      .then((newComment) => {
        setComments([...comments, newComment]);
        setNewComment("");
      })
      .catch((error) => console.error("Error adding comment:", error));
  };

  // Mostrar un mensaje de carga hasta que los comentarios estén listos
  if (loading || loadingComments) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        margin: "0",
        padding: "20px",
      }}
    >
      <div
        style={{
          marginTop: "80px",
          padding: "20px",
          display: "flex",
          gap: "20px",
          maxWidth: "1200px",
          width: "100%",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            backgroundColor: "#f9f9f9",
            padding: "30px",
            borderRadius: "8px",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
            flex: "1",
            fontSize: "16px",
            marginBottom: "20px",
            textAlign: "center",
          }}
        >
          <h2>{routeInfo.name}</h2>
          <p>
            <strong>Descripción:</strong> {routeInfo.description}
          </p>
          <p>
            <strong>Duración estimada:</strong> {routeInfo.duration} minutos
          </p>
          <p>
            <strong>Distancia total:</strong> {routeInfo.distance} km
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "row", gap: "20px" }}>
          <MapContainer
            center={coordinates}
            zoom={15}
            className="map"
            style={{ width: "75%", height: "500px" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {checkpoints.map((checkpoint, index) => (
              <Marker
                key={index}
                position={[
                  checkpoint.coordinates.startLatitude,
                  checkpoint.coordinates.startLongitude,
                ]}
              >
                <Popup>
                  <div>
                    <strong>{checkpoint.nameCheckpoint}</strong>
                    <br />
                    {checkpoint.audioguiaDTO?.url_audioguia.includes(".mp3") ? (
                      <audio controls>
                        <source
                          src={checkpoint.audioguiaDTO.url_audioguia}
                          type="audio/mpeg"
                        />
                        Tu navegador no soporta el elemento de audio.
                      </audio>
                    ) : (
                      <a
                        href={checkpoint.audioguiaDTO?.url_audioguia}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Audioguía
                      </a>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {route.length > 0 && (
              <Polyline
                positions={route.map((coord) => [coord[1], coord[0]])}
                color="red"
                weight={4}
                dashArray="5, 10"
              />
            )}
          </MapContainer>

          <div
            style={{
              width: "25%",
              backgroundColor: "#f1f1f1",
              padding: "15px",
              borderRadius: "8px",
              boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
            }}
          >
            <h3>Comentarios</h3>
            <div
              style={{
                maxHeight: "400px",
                overflowY: "auto",
                marginBottom: "10px",
              }}
            >
              {comments.length > 0 ? (
                comments.map((comment, index) => (
                  <p
                    key={index}
                    style={{
                      padding: "5px",
                      borderBottom: "1px solid #ccc",
                      fontSize: "14px",
                    }}
                  >
                    {comment.description}
                  </p>
                ))
              ) : (
                <p>No hay comentarios aún.</p>
              )}
            </div>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Añadir un comentario..."
              style={{
                width: "100%",
                padding: "5px",
                marginBottom: "5px",
                fontSize: "13px",
              }}
            />
            <button
              onClick={handleAddComment}
              style={{
                width: "100%",
                padding: "5px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              Agregar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RouteForm;
