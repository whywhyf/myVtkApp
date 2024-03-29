# vtk工程

## how to deploy

```shell
# 构建依赖
npm install

# 运行开发
npm run server

# 构建生产
npm build
```

## 前端框架

### Webpack

- [如何构建vtk.js - Webpack](https://kitware.github.io/vtk-js/docs/vtk_vanilla.html)

## 关于 vtk.js

- 3d 渲染工具
- [vtk.js官方文档](https://kitware.github.io/vtk-js)
- [讨论](https://discourse.vtk.org/)
- [blog](https://www.weiy.city/page/6/?s=vtk)

## 功能

- [x] 运行一个前端界面，向后端发送数据请求，根据返回的数据渲染模型及其颜色
- [x] 通过鼠标右键点击或按住来修改模型的label数据，同时更新渲染
- [ ] 微调模型label为前景或背景
- [ ] 保存数据
- [ ] 撤销操作

## 实现方法

### 前端

- 渲染库

  - vtk.js作为渲染库，以管线渲染的方式渲染数据

- 数据请求

  - fetch请求后端数据，数据为polydata对象用base64编码成的字符串
  - 收到后解码为xml，通过vtkXMLDataReader解析为polydata对象

- 颜色渲染

  - 通过修改polydata的属性改变渲染的颜色

  - ```js
    // 注意polydata有多个颜色属性，越底层的属性，渲染的优先级越高
    
    // point的颜色
    polyTeeth.getPointData().setScalars(<vtkDataArray>);
                                        
    // cell的颜色
    polyTeeth.getPointData().setScalars(<vtkDataArray>);
                                        
    // acotr的颜色
    actor.getProperty().setColor
    
    ```

- 交互事件

  - 绑定鼠标交互事件，当移动或按下时，拾取目标的cellid，从而改变label的值并更新渲染

- 硬件加速

  - vtkCellPicker在面对大模型时速度非常慢，因此需要使用硬件加速vtkHardwareSelector
  - 需要复杂的配置，详见官方示例

### 后端

- Django框架

## 任务书

- [x] 看 vue，写前端
  - [x] 看前端 toppanel 代码
  - [x] 仿制 toppanel
  - [x] 理解 toppanel 工作原理，state 管理状态，dispatch 和 action 更新 state，computed 自动监视 state 并刷新渲染
  - [x] 接下来涉及到鼠标事件交互和管理模型数据
- [x] 学习 vtk
- [x] 渲染一个模型并实现鼠标交互，如点击模型表面位置出现标识
- [x] 接下来尝试获取碰撞点所处面的数据，在发生碰撞时更改数据
  - [x] 学习模型的数据类型，想办法获取牙齿模型的点云数据
  - [x] 两种思路
  - [x] 1 对该面的所有点更改数据 暂时用这个
    - [x] 根据碰撞点找到面 id
      - [x] 改变面的颜色作为反馈
    - [x] 根据 id 改变点的数据
      - [x] 要建一个 array，记录所有点的所属类别 
        - [x] 用 json 文件， 先实现 js 保存和读取
        - [x] 如何确保 json 中点 id 和 vtk 中点 id 一样
        - [x] 如何找到 polydata 的 cell 及其 pointsids
        - [x] 设置 cell 的 scalars 改为设置 point 的 scalars
      - [ ] 点击后渲染速度很慢，需解决
        - [x] vtkHardwareSelector
        - [x] 后端用 python 的 vtkOBJImporter 读入 obj 传输 polydata 和 json
          - [x] 后端用 objimporter 读入模型读出 polydata
          - [x] 用 base64 转为 xml 的字符串数据发给前端
          - [x] 前端解码，用 parseasbuffer 解析为 polydata
        - [x] 前端渲染
        - [ ] 如何控制颜色？用标量映射 lookuptable？
        - [x] 三角化？lodactor？重新画一个 polydata 覆盖在上面？发给后端？
        - [x] 更新 array 和 polydata 非常耗时，因为需要一路更新到 actor，研究一下能不能直接在 actor 上操作 不行
        - [x] 对原polydata的操作必须一路更新到actor，耗时无法避免，弃用该方案，改为创建polydata覆盖 polydatalist已弃用 因为数量多后渲染变慢
        - [x] 试试appendpolydata？使用appendpolydata实现操作，要注意释放内存,
        - [ ] 把polyface的const改成let？
        - [ ] 后期试试用描框批量选中cell
        - [ ] 写一下 readme
      - [x] 最好有撤销和提交的功能
      - [x] 添加了改变画笔的功能
    - [x] 根据数据重新渲染模型，如改颜色
    - [x] 右键释放即commit
    - [x] 鼠标中键按住平移镜头
    - [x] label不只是0和1，后期可用‘吸色笔’实现牙齿类别的区分
    - [ ] 迁移到vue时可以增强信息反馈和交互，比如在上方显示当前微调状态，mode，画笔颜色

