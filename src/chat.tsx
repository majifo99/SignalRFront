import React, { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";

// Componente principal de Chat
const Chat = () => {
  // Estados del componente
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [messages, setMessages] = useState<{ id: number, user: string, message: string, timestamp: string }[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userName, setUserName] = useState(""); // Estado para el nombre del usuario
  const [isConnected, setIsConnected] = useState(false); // Estado para verificar la conexión
  
  // Efecto para obtener mensajes del servidor cuando el componente carga
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch("/Chat"); // Petición GET para obtener los mensajes almacenados
        const data = await response.json();
        setMessages(data); // Actualizar el estado con los mensajes recibidos
      } catch (error) {
        console.error("Error al obtener los mensajes:", error);
      }
    };

    fetchMessages();
  }, []);

  // Función para iniciar la conexión con SignalR
  const connectToHub = () => {
    if (!userName.trim()) {
      alert("Por favor, introduce un nombre de usuario.");
      return;
    }

    // Construimos la conexión usando el HubConnectionBuilder
    const connection = new signalR.HubConnectionBuilder()
      .withUrl("https://localhost:7221/chathub") // Cambiar a HTTP si es necesario
      .withAutomaticReconnect() // Configurar reconexión automática
      .configureLogging(signalR.LogLevel.Information) // Configurar logging para depuración
      .build();

    setConnection(connection);

    // Iniciar la conexión al cargar el componente
    connection
      .start()
      .then(() => {
        console.log("Conectado a SignalR Hub");
        setIsConnected(true); // Cambiar estado a conectado

        // Listener para recibir mensajes en tiempo real
        connection.on("ReceiveMessage", (user, message) => {
          const timestamp = new Date().toLocaleTimeString();
          setMessages((prevMessages) => [
            ...prevMessages,
            { id: prevMessages.length + 1, user, message, timestamp },
          ]);
        });
      })
      .catch((error) => {
        console.error("Error al iniciar la conexión con SignalR:", error);
      });

    // Limpiar la conexión cuando el componente se desmonte
    return () => {
      if (connection) {
        connection.stop();
      }
    };
  };

  // Función para enviar mensajes
  const sendMessage = async () => {
    if (newMessage.trim() !== "" && connection) {
      try {
        // Invocamos el método del servidor "SendMessage"
        await connection.invoke("SendMessage", userName, newMessage);

        // Hacer POST al backend para almacenar el mensaje
        await fetch("/Chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: messages.length + 1,
            user: userName,
            message: newMessage,
            timestamp: new Date().toISOString(),
          }),
        });

        // Limpiar el campo de texto después de enviar el mensaje
        setNewMessage("");
      } catch (error) {
        console.error("Error al enviar el mensaje:", error);
      }
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <h1 className="bg-blue-600 text-white text-center py-4 text-xl font-semibold">
        Chat en Tiempo Real
      </h1>
      
      {/* Si no está conectado, mostrar el campo para ingresar el nombre de usuario */}
      {!isConnected ? (
        <div className="flex flex-col items-center justify-center flex-grow">
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Introduce tu nombre de usuario..."
            className="p-2 border border-gray-300 rounded-md w-1/2 focus:ring focus:ring-blue-500"
          />
          <button 
            onClick={connectToHub} 
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition"
          >
            Conectar
          </button>
        </div>
      ) : (
        <div className="flex flex-col flex-grow">
          {/* Mostrar los mensajes recibidos */}
          <div className="flex-grow overflow-y-auto p-4 bg-gray-50 shadow-inner">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`mb-2 p-2 rounded-md ${
                  msg.user === userName ? 'bg-blue-100 self-end' : 'bg-gray-200 self-start'
                }`}
              >
                <strong>{msg.user}</strong>: {msg.message}
                <em className="block text-right text-xs text-gray-600">{msg.timestamp}</em>
              </div>
            ))}
          </div>

          {/* Campo de texto para escribir un nuevo mensaje */}
          <div className="p-4 bg-gray-200">
            <div className="flex items-center">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-grow p-2 rounded-md border border-gray-300 focus:ring focus:ring-blue-500"
              />
              <button 
                onClick={sendMessage}
                className="ml-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
