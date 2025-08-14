# Crypto Pulse

Crypto Pulse is a full-stack, real-time cryptocurrency price tracking application built with a modern, microservices-oriented architecture. It fetches data from the CoinGecko API, processes it through a Kafka pipeline for real-time distribution, persists historical data in a PostgreSQL database, and delivers live updates to a React frontend via WebSockets.

## Features

* Real-time price updates for multiple cryptocurrencies.
* Historical price data persistence and retrieval.
* Scalable microservices architecture using NodeJS.
* Efficient real-time data streaming with Apache Kafka (in KRaft mode).
* PostgreSQL database for data persistence.
* Redis for response caching to improve API performance.
* Fully containerized for easy setup and deployment with Docker and Docker Compose.

## Architecture Overview

The application uses a microservices architecture orchestrated by Docker Compose:

1.  **`data-fetcher` (NodeJS):** Periodically fetches crypto data from the CoinGecko API and publishes it to a Kafka topic (`crypto-updates`).
2.  **`websocket-service` (NodeJS):** Consumes messages from the `crypto-updates` Kafka topic. It has two primary responsibilities:
    * **Persisting** each price update to the PostgreSQL database.
    * **Broadcasting** the real-time update to all connected frontend clients via WebSockets.
3.  **`api-service` (NodeJS/Express):** Provides a RESTful API. Its key role is to serve historical data by querying the PostgreSQL database. It uses **Redis** as a caching layer to reduce database load and improve response times for frequent requests.
4.  **`frontend` (React):** A Single Page Application (SPA) built with React and TypeScript.
    * On initial load, it fetches recent price history from the `api-service`.
    * It then connects to the `websocket-service` to receive and display live price updates.
5.  **`kafka` (KRaft mode):** The messaging backbone for real-time data flow, running without Zookeeper for a simpler, more modern setup.
6.  **`postgres`:** The primary relational database for storing all historical price data.
7.  **`redis`:** An in-memory data store used by the `api-service` for caching.

## Prerequisites

* [Docker](https://docs.docker.com/get-docker/)
* [Docker Compose](https://docs.docker.com/compose/install/)

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd crypto-pulse
    ```

2.  **Create Environment File:**
    Copy the example environment file. This file contains all the necessary variables to configure the services.
    ```bash
    cp .env.example .env
    ```

3.  **Configure Environment Variables:**
    Open the `.env` file and fill in the required values. The most important one to get started is the CoinGecko API key.
    * `COINGECKO_API_KEY`: **Required**. Get a free API key from [CoinGecko](https://www.coingecko.com/en/api).
    * Update `POSTGRES_USER` and `POSTGRES_PASSWORD` with secure credentials.
    * Review other ports and settings if they conflict with other services on your machine.

4.  **Build and Run with Docker Compose:**
    This command will build the images for all custom services and start the entire application stack in detached mode.
    ```bash
    docker-compose up --build -d
    ```

5.  **Access the Application:**
    * **Frontend:** Open your web browser and navigate to `http://localhost:3000` (or the `FRONTEND_PORT` you configured).
    * **API:** You can test the API endpoints, for example, by visiting `http://localhost:5001/api/v1/health` or `http://localhost:5001/api/v1/cryptos`.

6.  **Shutting Down:**
    To stop all services, run:
    ```bash
    docker-compose down
    ```
    To stop services and remove the database volume (for a completely fresh start), run:
    ```bash
    docker-compose down -v
    ```
