// backend/src/lambda/http/createTodo.js
const { v4: uuid } = require('uuid');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE = process.env.TODOS_TABLE;

// CORS helper (include headers used by browsers during preflight)
const cors = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE'
});

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// Safely extract user id for both REST (custom authorizer) and HTTP API (JWT authorizer)
function getUserId(event) {
  // REST API + Lambda authorizer (common in Udacity starter)
  const restPrincipal = event?.requestContext?.authorizer?.principalId;
  if (restPrincipal) return restPrincipal;

  // HTTP API + JWT authorizer (v2)
  const sub = event?.requestContext?.authorizer?.jwt?.claims?.sub
          || event?.requestContext?.authorizer?.claims?.sub; // some stacks use 'claims'
  return sub || null;
}

module.exports.handler = async (event) => {
  try {
    // Handle CORS preflight quickly (some stacks send it to the lambda)
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers: cors(), body: '' };
    }

    const userId = getUserId(event);
    if (!userId) {
      return { statusCode: 401, headers: cors(), body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const data = JSON.parse(event.body || '{}');
    if (!data.name || !data.dueDate) {
      return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'name and dueDate required' }) };
    }

    const item = {
      userId,
      todoId: uuid(),
      createdAt: new Date().toISOString(),
      name: data.name,
      dueDate: data.dueDate,
      done: false
    };

    await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));

    return { statusCode: 201, headers: cors(), body: JSON.stringify(item) };
  } catch (e) {
    console.error('createTodo error', e);
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: e.message }) };
  }
};
