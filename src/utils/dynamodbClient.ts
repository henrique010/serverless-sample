import { DynamoDB } from 'aws-sdk';

const options: DynamoDB.Types.ClientConfiguration = {
    region: 'localhost',
    endpoint: 'http://localhost:8000',
    credentials: {
        accessKeyId: 'x',
        secretAccessKey: 'x'
    }
}

const isOffline = () => process.env.IS_OFFLINE

export const document = isOffline() 
    ? new DynamoDB.DocumentClient(options)
    : new DynamoDB.DocumentClient()