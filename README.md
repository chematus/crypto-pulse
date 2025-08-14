# Crypto Pulse

Crypto Pulse is a full-stack, real-time cryptocurrency price tracking application built with a modern, microservices-oriented architecture. It fetches data from the CoinGecko API, processes it through a Kafka pipeline for real-time distribution, persists historical data in a PostgreSQL database, and delivers live updates to a React frontend via WebSockets.

## Features

* Real-time price updates for multiple cryptocurrencies.
* Historical price data persistence and retrieval via a REST API.
* Scalable microservices architecture using NodeJS and TypeScript.
* Efficient real-time data streaming with Apache Kafka (in KRaft mode).
* PostgreSQL database for data persistence.
* Redis for response caching to improve API performance.
* Fully containerized for easy setup and deployment with Docker and Docker Compose.
* Comprehensive unit and integration test suites for all services using Vitest.
* Automated CI pipeline using GitHub Actions to run tests on every push.

## Architecture Overview

The application uses a microservices architecture orchestrated by Docker Compose:

1.  **`data-fetcher` (NodeJS):** Periodically fetches crypto data from the CoinGecko API and publishes it to a Kafka topic.
2.  **`websocket-service` (NodeJS):** Consumes messages from the Kafka topic, persists each update to the PostgreSQL database, and broadcasts the real-time update to all connected frontend clients.
3.  **`api-service` (NodeJS/Express):** Provides a RESTful API to serve historical data from the PostgreSQL database, using Redis as a caching layer.
4.  **`frontend` (React):** A Single Page Application that fetches initial data from the `api-service` and connects to the `websocket-service` for live updates.
5.  **`kafka` (KRaft mode):** The messaging backbone for real-time data flow.
6.  **`postgres`:** The primary relational database for storing historical price data.
7.  **`redis`:** An in-memory data store used by the `api-service` for caching.

## Prerequisites

* [Docker](https://docs.docker.com/get-docker/)
* [Docker Compose](https://docs.docker.com/compose/install/)

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/chematus/crypto-pulse.git
    cd crypto-pulse
    ```

2.  **Create Environment File:**
    Copy the example environment file. This file contains all the necessary variables to configure the services.
    ```bash
    cp .env.example .env
    ```

3.  **Configure Environment Variables:**
    Open the `.env` file and fill in the required values. The most important ones are `COINGECKO_API_KEY` and `KAFKA_CLUSTER_ID`.
    * `COINGECKO_API_KEY`: **Required**. Get a free API key from [CoinGecko](https://www.coingecko.com/en/api).
    * `KAFKA_CLUSTER_ID`: **Required**. Generate a unique ID by running this command once: `docker run --rm confluentinc/cp-kafka:7.5.0 kafka-storage random-uuid`.

4.  **Build and Run with Docker Compose:**
    This command will build the images for all custom services and start the entire application stack.
    ```bash
    docker-compose up --build -d
    ```

5.  **Access the Application:**
    * **Frontend:** `http://localhost:3000`
    * **API Health Check:** `http://localhost:5001/api/v1/health`

## Testing

Each service contains its own suite of unit and integration tests. The project is configured with a CI pipeline using GitHub Actions to automatically run these tests on every push to the `main` and `develop` branches.

To run the tests manually for a specific service, navigate to its directory and run the test command.

**Example: Running tests for the API service**
```bash
cd api-service
npm test
Example: Running tests for the frontendcd frontend
npm test
Shutting DownTo stop all running services:docker-compose down
To stop services and remove the database volume for a completely fresh start:docker-compose down -v
