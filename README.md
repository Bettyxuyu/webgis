# 运河千年——中国大运河文化遗产数字档案

WebGIS课程作业，以真实运河线路、697条遗产点与历史专题，展示运河的地理和文化联系。

## 技术与功能
Vite + JavaScript + OpenLayers；全屏巡游使用MapLibre GL JS的倾斜平面视角。五个导航入口：序章、运河图志、八埠寻踪、千年水脉、两岸人间。包括检索/点选/图层、八站巡游、六期历史地图、14份图文档案和实时统计。

## 运行
需要Node.js 24及npm。首次安装需要联网：
```sh
npm ci
npm run dev
```
打开终端显示的本地网址。请通过HTTP服务打开，不要双击index.html。

## 构建
```sh
npm run build
npm run preview -- --base /course/
```
默认dist可用于后续静态HTTPS托管，未确认许可的照片不进入此构建。base为相对路径，支持/course/子目录。

课堂本地审阅含177张图片派生资源：
```sh
npm run build:review
npm run preview:review -- --base /course/
```
审阅输出dist-review仅供本地课堂审阅，课堂用途不自动意味着获得公开授权。公开发布前应逐项核对SOURCE_NOTES和media_review各索引中的许可。

## 目录
- src：页面、GIS与交互模块
- public：最终WGS84 GeoJSON、EPSG:3857晕渲及索引图
- content：正式展示正文
- media_review：课堂图片派生资源与对应关系（默认公开构建排除）
- licenses：第三方库许可证
- SOURCE_NOTES.md / SOURCE_DATA_MANIFEST.json：来源、口径及原始数据清单

## 数据与限制
GeoJSON统一经纬度；OpenLayers使用Web Mercator显示。历史线来自人工数字化概化，保留原字段与坐标；城市区域标签不等于古城址测量坐标。地形图为晕渲影像，不是真实三维高程。697为研究点记录，58条世界级分组不是58项独立世界遗产。

可选全球底图需要互联网连接。课堂本地版使用OpenMaps.fr提供的OpenTopoMap-R（OSM数据），保留数据与样式署名及服务支持链接；仅加载当前视图，不预取或打包瓦片。OSM-France要求非营利、适度流量且网站公开可访问，不适用于localhost/内网课堂；仅在确认满足政策后为公开部署设置VITE_OSMFR_PUBLIC=true并重新构建（见SOURCE_NOTES.md）。无网络时可使用自带专题数据和既有区域晕渲，不能声称离线覆盖全球。原始大DEM和未使用概览文件不在提交包中，仍保留于原开发目录；必要源数据见清单。

在线服务限制：OpenMaps.fr实测可加载中国及欧洲地图，但存在延迟和服务端捐助提示瓦片；不保证每次视图都能迅速填满。课堂演示默认使用自带地形，联网底图作为可选增强。
