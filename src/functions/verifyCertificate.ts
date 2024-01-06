import { APIGatewayProxyHandler } from "aws-lambda";
import { document } from "../utils/dynamodbClient";


export const handler: APIGatewayProxyHandler = async (event) => {
    const { id } = event.pathParameters

    const response = await document.query({
        TableName: 'users_certificate',
        ExpressionAttributeValues: {
            ':id': id
        },
        KeyConditionExpression: 'id = :id',
    }).promise()

    const user = response.Items[0]

    if(!user) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'There is no valid certificate for this user'
            })
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'There is a valid certificate for this user',
            username: user.name,
            url: `https://certificate-generation-2024.s3.amazonaws.com/${id}.pdf`
        })
    }
}