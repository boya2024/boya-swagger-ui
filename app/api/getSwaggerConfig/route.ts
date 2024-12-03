// 文件路径: pages/api/hello.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const baseUrl = 'http://dev.poincares.com:8080';

export async function GET(req: NextApiRequest, res: NextApiResponse) {

  try {
    const result = await fetch(`${baseUrl}/v3/api-docs/account-api/swagger-config`);
    console.log('result',result);
    if (!result.ok) {
      throw new Error(`HTTP error! status: ${result.status}`);
    }
    const data = await result.json();
    return Response.json(data)
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}