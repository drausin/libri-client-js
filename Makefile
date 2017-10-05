

lint:
	@echo "--> Running linters"
	@./node_modules/.bin/eslint libri/**
	@npm run flow status

fix:
	@echo "--> Running eslint with fix"
	@./node_modules/.bin/eslint --fix libri/**

proto:
	@echo "--> Running protoc"
	@pushd libri && ../node_modules/grpc-tools/bin/protoc.js ./librarian/api/*.proto --js_out=import_style=commonjs,binary:. --grpc_out=. && popd

test:
	@echo "--> Running npm test"
	@npm test