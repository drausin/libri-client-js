
acceptance:
	@echo "--> Running acceptance tests"
	@./libri/acceptance/author-test.sh

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
	@echo "--> Running unit tests"
	@./node_modules/jest-cli/bin/jest.js --testPathIgnorePatterns 'libri/acceptance/.+.test.js'