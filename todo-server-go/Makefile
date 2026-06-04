APP=todo-server-go

.PHONY: run test build tidy sqlc

run:
	go run ./cmd/api

test:
	go test ./...

build:
	go build ./...

tidy:
	go mod tidy

sqlc:
	sqlc generate
