// 文件路径: pages/api/hello.ts
import { type NextRequest } from 'next/server'


var baseUrl = 'http://dev.poincares.com:8080';
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get('url')
  let result = await fetch(`${baseUrl}${url}`);
  if (!result.ok) {
    throw new Error(`HTTP error! status: ${result.status}`);
  }
  const data = await result.json();
  return Response.json(data)
}
