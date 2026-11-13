# 来源与使用说明

## 空间数据
京杭运河来源于原Beijing-HangzhouGrandCanalshp；697点来源于HeritageSitesBHGC研究数据。既有属性与坐标未因视觉改版改变。原论文记录：https://www.geodoi.ac.cn/DOIPaper/HTML/2026139404/202604139410.html 。
行政边界来源于用户的中国行政区划/标准国界资料，原目录标注GS（2024）0650号，本专题不是完整标准地图替代品。
历史河道来源于用户historical_data五份SHP的人工数字化成果；依据历史参考地图人工数字化的概化线路，不是精确复原。qin中邗沟PERIOD原写隋朝，按用户指定场景展示；未命名西侧线未作先秦水道显示；明清专题仅有明代概化线，不能代表清代全期。源数据差异保留。
五级水系来自source_data/waterways，按源分组和缩放分辨率加载，级别不能直接解释为河流大小。最终分块作过裁剪和概化。
晕渲来自source_data/dem/dem.tif，经边界掩膜、低饱和分层设色与晕渲融合输出；public/terrain/relief.json记录配准范围。分省概览不具完整地理参考，未用于3D。
原始数据清单位于SOURCE_DATA_MANIFEST.json；为保持提交体积，未复制大DEM、过程瓦片、重复压缩包。最终程序完全依赖包内派生数据，无原开发目录依赖。

## 文字与图片
content/history-exhibition.md与culture-exhibition.md为用户正式文稿，文末完整参考文献保留。页面仅在渲染层隐藏管理字段。
media_review含世界级遗产112张、城市34张、文化31张，共177张重新编码WebP。索引记录原路径、对应档案及许可状态；原始照片保留于原开发项目。文化31张来源目录明确，其中部分具体桥名/技艺待核查，展示层不显示未经核实的图注及笼统年代，原记录保留。其他18份地图海报未擅自归档。未确认许可图片只供本地审阅，不随默认dist公开发布。

## 在线底图
默认专题底图与所有GIS数据随项目发布，无需联网。可选全球底图如下：

- 本地课堂版：OpenMaps.fr的OpenTopoMap-R，https://tile.openmaps.fr/opentopomap/{z}/{x}/{y}.png 。政策：https://openmaps.fr/tile-usage-policy.html 。非商业适度使用免费（当前上限500,000瓦片/月、5,000瓦片/IP/小时），无API密钥。保留OpenStreetMap贡献者、样式署名及支持链接。不得批量抓取、预取或离线下载。
- OSM-France：https://{a-c}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png 。政策：https://www.openstreetmap.fr/usage/ 。仅适用于非营利、公开可访问且适度流量的网站；localhost、内网或需登录的网站不符合条件，因此课堂版禁用。确认公开站点符合政策后，设置VITE_OSMFR_PUBLIC=true再构建；该设置是部署者的合规声明，不代表项目已通过服务方批准。保留OSM贡献者ODbL及OSM-France CC BY-SA署名。

使用浏览器正常HTTP缓存和Referer，遵循服务方当前政策。不保证第三方服务可用性；失败会提示并恢复自带地形。无代理、未知镜像或全球瓦片下载。未声称完成公网发布或外部网络验收。

## 网站标识
public/logo.webp来自用户提供的根目录logo.webp（402×402），原比例展示；站点favicon与移动端图标共用该正式资源，未擅自改变授权状态。

## 统计口径
697点；世界58、国家200、省439。年代仅对Cons_CN原值精确分类，其余表述单列；不对跨代或具体年份作推断归并。数据不等于所有大运河遗产总数。

在线服务限制：OpenMaps.fr实测可加载中国及欧洲地图，但存在延迟和服务端捐助提示瓦片；不保证每次视图都能迅速填满。课堂演示默认使用自带地形，联网底图作为可选增强。
