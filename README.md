# Crypto Pulse 🚀

Crypto Pulse is a real-time cryptocurrency price tracking application. It fetches data from the CoinGecko API, processes it through a Kafka pipeline, and delivers live updates to a React frontend via WebSockets.

## ✨ Features

* Real-time price updates for selected cryptocurrencies.
* Microservices architecture for scalability and maintainability.
* Leverages Kafka for efficient data streaming.
* Containerized deployment using Docker and Docker Compose.

## 🛠️ Tech Stack

* **Frontend:** React
* **Backend Services:** NodeJS (Express for API, WebSocket)
* **Database:** PostgreSQL
* **Caching:** Redis
* **Messaging Queue:** Apache Kafka
* **API Data Source:** CoinGecko API
* **Containerization:** Docker & Docker Compose

## 🏛️ Architecture Overview

The application uses a microservices architecture orchestrated by Docker Compose:

1.  **`data-fetcher` (NodeJS):** Periodically fetches crypto data from the CoinGecko API and publishes it to a Kafka topic (`crypto-updates`).
2.  **`api-service` (NodeJS/Express):** Provides RESTful endpoints for non-real-time data (e.g., fetching the list of available cryptos from Postgres). Uses Redis for caching.
3.  **`websocket-service` (NodeJS):** Subscribes to the `crypto-updates` Kafka topic and pushes new price data to connected frontend clients via WebSockets.
4.  **`frontend` (React):** Displays the crypto data, connects to the `websocket-service` for live updates, and interacts with the `api-service`.
5.  **`kafka`:** Form the messaging backbone for real-time data flow.
6.  **`postgres`:** Stores persistent data like the list of tracked cryptocurrencies.
7.  **`redis`:** Provides caching capabilities, primarily for the `api-service`.

## 📁 Project Structure

The project follows a monorepo structure, with each service residing in its own directory:

```
crypto-pulse/
├── data-fetcher/
├── api-service/
├── websocket-service/
├── frontend/
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

## 📋 Prerequisites

* [Docker](https://docs.docker.com/get-docker/)
* [Docker Compose](https://docs.docker.com/compose/install/)
* A CoinGecko API Key (Free tier available) - [Get it here](https://www.coingecko.com/en/api)

## 🚀 Getting Started

1.  **Clone the repository:**

2.  **Create Environment File:**
    Copy the example environment file:
    ```bash
    cp .env.example .env
    ```

3.  **Configure Environment Variables:**
    Open the `.env` file and fill in the required values:
    * `COINGECKO_API_KEY`: Your CoinGecko API key.
    * `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: Credentials for the PostgreSQL database.
    * `REDIS_PASSWORD` (optional): Password for Redis.
    * Ports for different services (`FRONTEND_PORT`, `API_PORT`, `WEBSOCKET_PORT`) if you need to change defaults.
    * Specify the Kafka connection details.
    * Define the list of cryptocurrencies to track (e.g., `TRACKED_COIN_IDS=bitcoin,ethereum,litecoin`). The `data-fetcher` will use this.

4.  **Build and Run with Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```

5.  **Access the Application:**
    Open your web browser and navigate to:
    `http://localhost:<FRONTEND_PORT>` (default is usually `http://localhost:3000`)

## ⚙️ Environment Variables (.env)

* `COINGECKO_API_KEY`: **Required** for the `data-fetcher` service.
* `TRACKED_COIN_IDS`: Comma-separated list of CoinGecko coin IDs (e.g., `bitcoin,ethereum`) for the `data-fetcher`.
* `FETCH_INTERVAL_MS`: How often the `data-fetcher` polls CoinGecko (in milliseconds, e.g., `60000` for 1 minute). Be mindful of API rate limits.
* `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: Database credentials used by `api-service` and potentially `data-fetcher`.
* `DATABASE_URL`: Full connection string for Postgres (often derived from the above, e.g., `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}`).
* `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`: Connection details for Redis used by `api-service`.
* `KAFKA_BROKER`: Kafka broker address(es) (e.g., `kafka:9092`).
* `FRONTEND_PORT`, `API_PORT`, `WEBSOCKET_PORT`: External ports mapped for accessing services.

## 🔧 Running Services Individually (Optional - for Development)

If you prefer to run a service outside Docker (e.g., for faster frontend development):

1.  Navigate to the service directory (e.g., `cd frontend`).
2.  Install dependencies: `npm install` (or `yarn install`).
3.  Ensure necessary environment variables are set in your shell or via a local `.env` file within that service directory (pointing to other services potentially running in Docker, e.g., `REACT_APP_API_URL=http://localhost:5001`, `REACT_APP_WS_URL=ws://localhost:5002`).
4.  Run the development server: `npm start` (or `yarn dev`).
