// backend/src/lambda/http/getTodos.js
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  QueryCommand
} = require('@aws-sdk/lib-dynamodb');

const TABLE = process.env.TODOS_TABLE;                // e.g. Todos-dev
const INDEX = process.env.TODOS_INDEX_NAME;           // e.g. UserIdCreatedAtIndex
const ORIGIN = process.env.WEB_ORIGIN;                // e.g. your app.github.dev origin

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const cors = () => ({
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Credentials': false, // matches serverless.yml
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'OPTIONS,GET'
});

// Extract userId from custom/JWT authorizer
function getUserId(event) {
  const restPrincipal = event?.requestContext?.authorizer?.principalId;
  if (restPrincipal) return restPrincipal;

  const sub =
    event?.requestContext?.authorizer?.jwt?.claims?.sub ||
    event?.requestContext?.authorizer?.claims?.sub;
  return sub || null;
}

// Helpers for pagination token (base64 JSON of DynamoDB key)
function encodeNextKey(lastEvaluatedKey) {
  if (!lastEvaluatedKey) return null;
  return Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64');
}
function decodeNextKey(token) {
  if (!token) return undefined;
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
  } catch {
    return undefined;
  }
}

exports.handler = async (event) => {
  try {
    // Preflight
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers: cors(), body: '' };
    }

    const userId = getUserId(event);
    if (!userId) {
      return { statusCode: 401, headers: cors(), body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const qs = event.queryStringParameters || {};
    const limit = Math.min(Math.max(parseInt(qs.limit || '20', 10) || 20, 1), 100); // 1..100
    const startKey = decodeNextKey(qs.nextKey);

    const params = {
      TableName: TABLE,
      IndexName: INDEX,
      KeyConditionExpression: '#uid = :uid',
      ExpressionAttributeNames: { '#uid': 'userId' },
      ExpressionAttributeValues: { ':uid': userId },
      ScanIndexForward: false, // newest first by createdAt if that's your GSI sort key
      Limit: limit,
      ExclusiveStartKey: startKey
    };

    const res = await ddb.send(new QueryCommand(params));

    return {
      statusCode: 200,
      headers: cors(),
      body: JSON.stringify({
        items: res.Items || [],
        nextKey: encodeNextKey(res.LastEvaluatedKey) // null if no more pages
      })
    };
  } catch (err) {
    console.error('getTodos error', err);
    return {
      statusCode: 500,
      headers: cors(),
      body: JSON.stringify({ error: err.message })
    };
  }
};
