
"use client"

import * as React from "react"
import { ChevronRight } from "lucide-react"

import { SearchForm } from "@/components/search-form"
import { VersionSwitcher } from "@/components/version-switcher"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react";


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

interface pageData {
  schemasCount: number;
  moduleCount: number;
  apiCount: number;
}

export function AppSidebar({ updatePage, handleItemClick, ...props }: React.ComponentProps<typeof Sidebar> & { updatePage: (pageData:pageData) => void, handleItemClick: (subMenu: subMenuItem) => void }) {

  const [menuList, setMenuList] = useState<menuItem[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    console.log('fetching data');
    try {
      let result = await fetch(`/api/getSwaggerConfig`);
      if (!result.ok) {
        throw new Error('Network response was not ok');
      }
      let data = await result.json();
      let urlList: urlItem[] = data.urls;
      let menuList: menuItem[] = [];
      let schemasCount: number = 0;

      // 使用 Promise.all 来处理多个异步请求
      const menuPromises = urlList.map(async (urlItem: urlItem) => {
        let detailResult = await fetch(`/api/getApiDetail?url=${urlItem.url}`);
        if (!detailResult.ok) {
          throw new Error('Failed to fetch API detail');
        }
        let detailData = await detailResult.json();
        let subMenu: subMenuItem[] = [];
        let schemas:Schemas = detailData.components.schemas;
        Object.keys(detailData.paths).forEach((path: string) => {
          var interfaceData = detailData.paths[path];
          Object.keys(interfaceData).forEach((method: string) => {
            var requestProperties:Object = interfaceData[method]['requestBody']?.['content']?.['application/json']?.['schema']?.['properties'] || null;
            var requestBodySchemaName: string | null = interfaceData[method]['requestBody']?.['content']?.['application/json']?.['schema']?.['$ref'] || null;
            var responseBodySchemaName: string | null = interfaceData[method]['responses']['200']?.['content']?.['*/*']?.['schema']?.['$ref'] || null;
            // if(!interfaceData[method].summary){
            //   console.log(urlItem.name,path.split('/').pop(), interfaceData);
            // }
            var requestBody = null;
            if(requestBodySchemaName){
              requestBody = schemas[requestBodySchemaName.split('/').pop() as string];
            }else{
              requestBody = {properties:requestProperties};
            }
            if( path.split('/').pop() == 'modifyCertify'){
              console.log(requestBody);
            }
            subMenu.push({
              parentTitle: urlItem.name,
              title: interfaceData[method].summary || path.split('/').pop(),
              url: path,
              path: path,
              method: method,
              data: interfaceData[method],
              schemas: schemas,
              requestBody: requestBody,
              responseBody: responseBodySchemaName?schemas[responseBodySchemaName.split('/').pop() as string] : null,
              isActive: false,
            });
          });
        });

        schemasCount = schemasCount + Object.keys(schemas).length;
        menuList.push({
          title: urlItem.name,
          url: urlItem.url,
          items: subMenu,
        });
      });
      await Promise.all(menuPromises);
      setMenuList(menuList);
      updatePage({
        schemasCount: schemasCount,
        moduleCount: urlList.length,
        apiCount: menuList.reduce((acc, curr) => acc + curr.items.length, 0),
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }
  

  const renderSidebarContent = () => {
    if(menuList.length == 0){
      var list:React.ReactNode[] = [];
      for(var i = 0; i < 10; i++){
        list.push(
          <div
          key={i}
          className="mx-3 mb-3 h-[50px] rounded-lg bg-muted/100"
        />
        )
      }
      return list;
    }
    return(
      menuList.map((menu:menuItem) => (
        <Collapsible
          key={menu.title}
          title={menu.title}
          // defaultOpen
          className="group/collapsible"
        >
          <SidebarGroup>
            <SidebarGroupLabel
              asChild
              className="group/label text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <CollapsibleTrigger>
                {menu.title}{" "}
                <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menu.items.map((subMenu:subMenuItem) => (
                    <SidebarMenuItem key={`${subMenu.title}-${subMenu.method}`} onClick={() => handleItemClick(subMenu)}>
                      <SidebarMenuButton asChild isActive={subMenu.isActive}>
                        <a className="cursor-pointer"><Badge >{subMenu.method.toUpperCase()}</Badge>{subMenu.title}</a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      ))
    )
  }


  
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <VersionSwitcher
          versions={['1.0.0']}
          defaultVersion={'1.0.0'}
        />
        <SearchForm />
      </SidebarHeader>
      <SidebarContent className="gap-0">
        {/* We create a collapsible SidebarGroup for each parent. */}
        {renderSidebarContent()}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
