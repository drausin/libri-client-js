

lint:
	@echo "--> Running linters"
	@./node_modules/.bin/eslint --fix libri/author/**
	@npm run flow status

proto:
	@echo "--> Running protoc"
	@pushd libri && protoc ./librarian/api/*.proto --js_out=import_style=commonjs,binary:. && popd

test:
	@echo "--> Running npm test"
	@npm test