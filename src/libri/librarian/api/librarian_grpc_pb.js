// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var librarian_api_librarian_pb = require('../../librarian/api/librarian_pb.js');
var librarian_api_documents_pb = require('../../librarian/api/documents_pb.js');

function serialize_api_FindRequest(arg) {
  if (!(arg instanceof librarian_api_librarian_pb.FindRequest)) {
    throw new Error('Expected argument of type api.FindRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_api_FindRequest(buffer_arg) {
  return librarian_api_librarian_pb.FindRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_api_FindResponse(arg) {
  if (!(arg instanceof librarian_api_librarian_pb.FindResponse)) {
    throw new Error('Expected argument of type api.FindResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_api_FindResponse(buffer_arg) {
  return librarian_api_librarian_pb.FindResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_api_GetRequest(arg) {
  if (!(arg instanceof librarian_api_librarian_pb.GetRequest)) {
    throw new Error('Expected argument of type api.GetRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_api_GetRequest(buffer_arg) {
  return librarian_api_librarian_pb.GetRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_api_GetResponse(arg) {
  if (!(arg instanceof librarian_api_librarian_pb.GetResponse)) {
    throw new Error('Expected argument of type api.GetResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_api_GetResponse(buffer_arg) {
  return librarian_api_librarian_pb.GetResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_api_IntroduceRequest(arg) {
  if (!(arg instanceof librarian_api_librarian_pb.IntroduceRequest)) {
    throw new Error('Expected argument of type api.IntroduceRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_api_IntroduceRequest(buffer_arg) {
  return librarian_api_librarian_pb.IntroduceRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_api_IntroduceResponse(arg) {
  if (!(arg instanceof librarian_api_librarian_pb.IntroduceResponse)) {
    throw new Error('Expected argument of type api.IntroduceResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_api_IntroduceResponse(buffer_arg) {
  return librarian_api_librarian_pb.IntroduceResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_api_PutRequest(arg) {
  if (!(arg instanceof librarian_api_librarian_pb.PutRequest)) {
    throw new Error('Expected argument of type api.PutRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_api_PutRequest(buffer_arg) {
  return librarian_api_librarian_pb.PutRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_api_PutResponse(arg) {
  if (!(arg instanceof librarian_api_librarian_pb.PutResponse)) {
    throw new Error('Expected argument of type api.PutResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_api_PutResponse(buffer_arg) {
  return librarian_api_librarian_pb.PutResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_api_StoreRequest(arg) {
  if (!(arg instanceof librarian_api_librarian_pb.StoreRequest)) {
    throw new Error('Expected argument of type api.StoreRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_api_StoreRequest(buffer_arg) {
  return librarian_api_librarian_pb.StoreRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_api_StoreResponse(arg) {
  if (!(arg instanceof librarian_api_librarian_pb.StoreResponse)) {
    throw new Error('Expected argument of type api.StoreResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_api_StoreResponse(buffer_arg) {
  return librarian_api_librarian_pb.StoreResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_api_SubscribeRequest(arg) {
  if (!(arg instanceof librarian_api_librarian_pb.SubscribeRequest)) {
    throw new Error('Expected argument of type api.SubscribeRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_api_SubscribeRequest(buffer_arg) {
  return librarian_api_librarian_pb.SubscribeRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_api_SubscribeResponse(arg) {
  if (!(arg instanceof librarian_api_librarian_pb.SubscribeResponse)) {
    throw new Error('Expected argument of type api.SubscribeResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_api_SubscribeResponse(buffer_arg) {
  return librarian_api_librarian_pb.SubscribeResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_api_VerifyRequest(arg) {
  if (!(arg instanceof librarian_api_librarian_pb.VerifyRequest)) {
    throw new Error('Expected argument of type api.VerifyRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_api_VerifyRequest(buffer_arg) {
  return librarian_api_librarian_pb.VerifyRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_api_VerifyResponse(arg) {
  if (!(arg instanceof librarian_api_librarian_pb.VerifyResponse)) {
    throw new Error('Expected argument of type api.VerifyResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_api_VerifyResponse(buffer_arg) {
  return librarian_api_librarian_pb.VerifyResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


// The Librarian service handles all of the main Libri functionality.
var LibrarianService = exports.LibrarianService = {
  // Introduce identifies the node by name and ID.
  introduce: {
    path: '/api.Librarian/Introduce',
    requestStream: false,
    responseStream: false,
    requestType: librarian_api_librarian_pb.IntroduceRequest,
    responseType: librarian_api_librarian_pb.IntroduceResponse,
    requestSerialize: serialize_api_IntroduceRequest,
    requestDeserialize: deserialize_api_IntroduceRequest,
    responseSerialize: serialize_api_IntroduceResponse,
    responseDeserialize: deserialize_api_IntroduceResponse,
  },
  // Find returns the value for a key or the closest peers to it.
  find: {
    path: '/api.Librarian/Find',
    requestStream: false,
    responseStream: false,
    requestType: librarian_api_librarian_pb.FindRequest,
    responseType: librarian_api_librarian_pb.FindResponse,
    requestSerialize: serialize_api_FindRequest,
    requestDeserialize: deserialize_api_FindRequest,
    responseSerialize: serialize_api_FindResponse,
    responseDeserialize: deserialize_api_FindResponse,
  },
  // Verify checks that a peer has the value for a given key or returns the closest peers to
  // that value.
  verify: {
    path: '/api.Librarian/Verify',
    requestStream: false,
    responseStream: false,
    requestType: librarian_api_librarian_pb.VerifyRequest,
    responseType: librarian_api_librarian_pb.VerifyResponse,
    requestSerialize: serialize_api_VerifyRequest,
    requestDeserialize: deserialize_api_VerifyRequest,
    responseSerialize: serialize_api_VerifyResponse,
    responseDeserialize: deserialize_api_VerifyResponse,
  },
  // Store stores a value in a given key.
  store: {
    path: '/api.Librarian/Store',
    requestStream: false,
    responseStream: false,
    requestType: librarian_api_librarian_pb.StoreRequest,
    responseType: librarian_api_librarian_pb.StoreResponse,
    requestSerialize: serialize_api_StoreRequest,
    requestDeserialize: deserialize_api_StoreRequest,
    responseSerialize: serialize_api_StoreResponse,
    responseDeserialize: deserialize_api_StoreResponse,
  },
  // Get retrieves a value, if it exists.
  get: {
    path: '/api.Librarian/Get',
    requestStream: false,
    responseStream: false,
    requestType: librarian_api_librarian_pb.GetRequest,
    responseType: librarian_api_librarian_pb.GetResponse,
    requestSerialize: serialize_api_GetRequest,
    requestDeserialize: deserialize_api_GetRequest,
    responseSerialize: serialize_api_GetResponse,
    responseDeserialize: deserialize_api_GetResponse,
  },
  // Put stores a value.
  put: {
    path: '/api.Librarian/Put',
    requestStream: false,
    responseStream: false,
    requestType: librarian_api_librarian_pb.PutRequest,
    responseType: librarian_api_librarian_pb.PutResponse,
    requestSerialize: serialize_api_PutRequest,
    requestDeserialize: deserialize_api_PutRequest,
    responseSerialize: serialize_api_PutResponse,
    responseDeserialize: deserialize_api_PutResponse,
  },
  // Subscribe streams Publications to the client per a subscription filter.
  subscribe: {
    path: '/api.Librarian/Subscribe',
    requestStream: false,
    responseStream: true,
    requestType: librarian_api_librarian_pb.SubscribeRequest,
    responseType: librarian_api_librarian_pb.SubscribeResponse,
    requestSerialize: serialize_api_SubscribeRequest,
    requestDeserialize: deserialize_api_SubscribeRequest,
    responseSerialize: serialize_api_SubscribeResponse,
    responseDeserialize: deserialize_api_SubscribeResponse,
  },
};

exports.LibrarianClient = grpc.makeGenericClientConstructor(LibrarianService);
