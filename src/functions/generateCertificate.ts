
import { APIGatewayProxyHandler } from "aws-lambda";
import { join,  } from 'path'
import { compile } from 'handlebars'
import dayjs from 'dayjs'
import chromium from 'chrome-aws-lambda';
import { S3 } from 'aws-sdk'

import { document } from "../utils/dynamodbClient";
import { readFileSync } from "fs";


interface IGenerateCertificate {
    id: string;
    name: string;
    grade: string;
}

interface ICompileTemplate extends IGenerateCertificate {
    medal: string;
    date: string;
}

const compileTemplate = async (data: ICompileTemplate) => {
    const filePath = join(process.cwd(), 'src', 'templates', 'certificate.hbs')
    const htmlFile = readFileSync(filePath, 'utf-8')

    return compile(htmlFile)(data)
}

export const handler: APIGatewayProxyHandler = async (event) => {
    const userData = JSON.parse(event.body) as IGenerateCertificate

    const response = await document.query({
        TableName: 'users_certificate',
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: {
            ':id': userData.id
        }
    }).promise()

    const userAlreadyExists = response.Items[0]

    if(!userAlreadyExists) {
        await document.put({ 
            TableName: 'users_certificate', 
            Item: {
                ...userData,
                created_at: new Date().getTime()
            }
        }).promise()
    }

    const medalPath = join(process.cwd(), 'src', 'templates', 'selo.png')
    const medal = readFileSync(medalPath, 'base64')

    const templateContexData: ICompileTemplate = {
        ...userData,
        medal,
        date: dayjs().format('DD/MM/YYYY')
    }

    const content = await compileTemplate(templateContexData)

    const browser = await chromium.puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
    })

    const page = await browser.newPage()
    await page.setContent(content)
    
    const pdf = await page.pdf({
        format: 'a4',
        landscape: true,
        printBackground: true,
        preferCSSPageSize: true,
        path: process.env.IS_OFFLINE ? './certificate.pdf' : null
    })

    await browser.close()

    const s3 = new S3()
    await s3.putObject({
        Bucket: 'certificate-generation-2024',
        ACL: 'public-read',
        Key: `${userData.id}.pdf`,
        Body: pdf,
        ContentType: 'application/pdf'
    }).promise()

    return {
        statusCode: 201,
        body: JSON.stringify({
            message: 'Certificate was generated successfully',
            url: `https://certificate-generation-2024.s3.amazonaws.com/${userData.id}.pdf`
        })
    }
}