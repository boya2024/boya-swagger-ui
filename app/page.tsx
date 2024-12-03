"use client"

import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { unified } from "unified"; 
import rehypeParse from "rehype-parse";
import remarkParse from "remark-parse";
import remark2rehype from "remark-rehype";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";
import stringify from "rehype-stringify";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { solarizedlight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './index.css';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'; 
import copy from 'copy-to-clipboard'; // 引入 copy-to-clipboard


interface urlItem {
  name: string;
  url: string;
}

interface menuItem {
  title: string;
  url: string;
  items: subMenuItem[];
}

interface subMenuItem {
  parentTitle: string,
  title: string;
  url: string;
  path: string;
  method: string;
  data: any;
  requestBody:Object;
  responseBody:Object;
  isActive: boolean;
  schemas:Schemas;
}

interface Schemas {
  [key: string]: any; 
}

interface RequestBody {
  properties: {
    [key: string]: {
      type: string;
      description: string;
      $ref: string;
      items: {
        type: string;
        $ref: string;
      };
    };
  };
}

interface pageData {
  schemasCount: number;
  moduleCount: number;
  apiCount: number;
}

const CodeBlock = ({ code,className }: { code: string,className?:string }) => {
  const [formattedCode, setFormattedCode] = useState("");
  const [isCopied, setIsCopied] = useState(false); 
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const processCode = async () => {
      const result = await unified()
        .use(remarkParse) 
        .use(remark2rehype)
        .use(rehypePrettyCode, {
          theme: "one-dark-pro", // 选择您喜欢的主题
          // 其他配置选项
          onVisitLine(node) {
            // const { children, position } = node;
          
            // // 如果没有子节点，直接返回
            // if (children.length === 0) return;
          
            // // 获取行号，使用默认值 1
            // const lineNo = position?.start.line ?? 1;
          
            // // 创建行号节点
            // const lineNumberNode = {
            //   type: 'element' as const, // 确保 type 是 'element'
            //   tagName: 'span',
            //   properties: { className: ['line-number'] },
            //   children: [{ type: 'text' as const, value: `${lineNo}` }], // 确保 type 是 'text'
            // };
            // // 将行号节点添加到子节点的开头
            // children.unshift(lineNumberNode);
          }
        })
        .use(rehypeStringify)
        .process(`\`\`\`javascript\n${code}\n\`\`\``); // 将代码包裹在代码块标记中
      setFormattedCode(String(result));
    };

    processCode();
  }, [code]);



  // 清理复制状态
  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => {
        setIsCopied(false);
      }, 3000);
      return () => clearTimeout(timer); // 清理定时器
    }
  }, [isCopied]);

  const copyToClipboard = () => {
    copy(code);
    setIsCopied(true);
  };


  // 处理展开/收起
  const toggleCollapse = (sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };


  return (
    <div className={`${className} code-block-container`} style={{ position: 'relative' }}>
      <button onClick={copyToClipboard} className="copy-button">
        {isCopied ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <div
        className="code-block"
        dangerouslySetInnerHTML={{ __html: formattedCode }}
      />
    </div>
  );
};

export default function Page() {

  const [currentMenu, setCurrentMenu] = useState<subMenuItem | null>(null);
  const [pageData, setPageData] = useState<pageData | null>(null);
  const [basicInfo, setBasicInfo] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/getBasicInfo')
      .then(response => response.json())
      .then(data => setBasicInfo(data));
  }, []);

  function handleItemClick(menu: subMenuItem) {
    setCurrentMenu(menu);
  }

  function assembleRequestData(requestBody: RequestBody) {
    console.log('assembleRequestData');
    if(requestBody == null) {
      return {};
    }
    const requestData: Record<string, string|Object> = {}; // 使用 Record 来定义对象类型
    const properties = requestBody.properties;
  
    for (const key in properties) {
      if (properties.hasOwnProperty(key)) {
        console.log(properties[key], properties[key]['type']);
        if(properties[key]['type'] != null) {
          console.log(properties[key], properties[key]['type']);
          if(properties[key]['type'] == 'array'){
            console.log(properties[key], 'array');
            var arrayType:string = properties[key]['items']['type'];
            requestData[key] = [`${arrayType}`] + `// ${properties[key]['description']}`;
          }else{
            requestData[key] = `${properties[key]['type']}` + `// ${properties[key]['description']}`;
          }
        }
        if(properties[key]['$ref'] != null) {
          var schemaName:string = properties[key]['$ref'].split('/').pop() as string;
          requestData[key] = assembleRequestData(currentMenu?.schemas?.[schemaName] as RequestBody);
        }
       
      }
    }
  
    return requestData; // 返回 requestData
  }

  function assembleDataString(requestBody: RequestBody, depth = 1) {
    if(requestBody == null) {
      return '{}';
    }
    const requestData: Record<string, string|Object> = {}; // 使用 Record 来定义对象类型
    const properties = requestBody.properties;
    var dataString:string = '';
    const indent = ' '.repeat(2*depth);
  
    for (const key in properties) {
      if (properties.hasOwnProperty(key)) {
        var description = '';
        if(properties[key]['description']){
          description = `// ${properties[key]['description']}`;
        }
        if(properties[key]['type'] != null) {
          if(properties[key]['type'] == 'array'){
            // console.log(properties[key], currentMenu, currentMenu?.title, currentMenu?.parentTitle);
            var arrayItemType:string = properties[key]['items']['type'];
            var arrayItemTypeRef:string = properties[key]['items']['$ref'];

            if(!arrayItemType&&arrayItemTypeRef){
              var itemSchemaName:string = arrayItemTypeRef.split('/').pop() as string;
              // console.log('itemSchemaName',arrayItemTypeRef,itemSchemaName, requestBody);
              var arrayItemTypeString = assembleDataString(currentMenu?.schemas?.[itemSchemaName] as RequestBody, depth + 2);
              if(key == 'data'){
                console.log('data - arrayItemTypeString', arrayItemTypeString)
              }
              dataString += `${indent}${key}: [\n${' '.repeat(2*(depth+1))}${arrayItemTypeString} \n${indent}] \n`;
            }else{
              console.log('data - arrayItemType', arrayItemType)
              dataString += `${indent}${key}: [ '${arrayItemType}' ] ${description} \n`;
            }
            
          }else{
            dataString += `${indent}${key}: '${properties[key]['type']}',  ${description} \n`;
          }
        }
        if(properties[key]['$ref'] != null) {
          var schemaName:string = properties[key]['$ref'].split('/').pop() as string;
          var schemaDataString = assembleDataString(currentMenu?.schemas?.[schemaName] as RequestBody, depth + 1);
          dataString += `${indent}${key}: ${schemaDataString},  ${description} \n`;
        }
      }
    }
  
    return `{\n${dataString}${' '.repeat(2*(depth-1))}}`; 
  }

  const renderPageContent = () => {
    if(pageData == null){
      let list:React.ReactNode[] = [];
      for(var i = 0; i < 24; i++){
        list.push(
          <div key={i} className="m-2 w-full h-16 rounded-lg bg-muted/50"></div>
        );
      }
      return list;
    }
    if(currentMenu == null){
      return(
        <>
          <div className="my-8 text-5xl font-bold text-center">{basicInfo?.info?.title}</div>
          <div className="flex flex-row items-center p-4">
            <CodeBlock className="flex-1"
              code={basicInfo?.servers[0]?.url}
            />
            <Button className="ml-4 w-24 h-[56px]">PING一下</Button>
          </div>
          <div className="m-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  模块数量
                </CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-muted-foreground"
                >
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pageData?.moduleCount||0}</div>
                {/* <p className="text-xs text-muted-foreground">
                  +20.1% from last month
                </p> */}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  接口数量
                </CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-muted-foreground"
                >
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pageData?.apiCount||0}</div>
                {/* <p className="text-xs text-muted-foreground">
                  +201 since last hour
                </p> */}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">实体类数量</CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-muted-foreground"
                >
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <path d="M2 10h20" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pageData?.schemasCount||0}</div>
                {/* <p className="text-xs text-muted-foreground">
                  +19% from last month
                </p> */}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  开发者数量
                </CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-muted-foreground"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2</div>
                {/* <p className="text-xs text-muted-foreground">
                  +180.1% from last month
                </p> */}
              </CardContent>
            </Card>
          </div>
        </>
      )
    }
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <h3 className="text-lg font-medium">请求参数</h3>
        <CodeBlock
          code={assembleDataString(currentMenu?.requestBody as RequestBody)}
        />
        <h3 className="text-lg font-medium">响应体</h3>
        <CodeBlock
          code={assembleDataString(currentMenu?.responseBody as RequestBody)}
        />
      </div>
    );
  }

  const renderHeaderContent = () => {
    if(currentMenu == null){
      return null;
    }
    return (
      <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink href="#">
            {currentMenu?.parentTitle}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        <BreadcrumbItem>
          <BreadcrumbPage>
            {/* <Badge >{currentMenu?.method.toUpperCase()}</Badge> */}
            <span>{currentMenu?.title}</span>
          </BreadcrumbPage>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        <BreadcrumbItem>
          <BreadcrumbPage>
          {currentMenu?.url}
            {/* <h2 className="text-2xl font-bold tracking-tight">
              {currentMenu?.url}
            </h2> */}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
    )
  }

  const updatePage = (pageData:pageData) => {
    setPageData(pageData);
  }

  return (
    <SidebarProvider>
      <AppSidebar handleItemClick={handleItemClick} updatePage={updatePage}/>
      <SidebarInset>
        <header className="flex sticky z-50 top-0 bg-background h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {renderHeaderContent()}
        </header>
        {renderPageContent()}
      </SidebarInset>
    </SidebarProvider>
  )
}