import '@kitware/vtk.js/favicon';

// Load the rendering pieces we want to use (for both WebGL and WebGPU)
import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkCalculator from '@kitware/vtk.js/Filters/General/Calculator';
import vtkConeSource from '@kitware/vtk.js/Filters/Sources/ConeSource';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import { AttributeTypes } from '@kitware/vtk.js/Common/DataModel/DataSetAttributes/Constants';
import { FieldDataTypes } from '@kitware/vtk.js/Common/DataModel/DataSet/Constants';

import vtkFPSMonitor from '@kitware/vtk.js/Interaction/UI/FPSMonitor';

import vtkCellPicker from '@kitware/vtk.js/Rendering/Core/CellPicker';
import vtkSphereSource from '@kitware/vtk.js/Filters/Sources/SphereSource';

// import自定义的函数
import {renderPolyDataByLabel, drawCell} from './render'

// import controlPanel from './index.html';
const controlPanel = `
<table>
  <tr>
    <td>
      <select class="representations" style="width: 100%">
        <option value="0">Points</option>
        <option value="1">Wireframe</option>
        <option value="2" selected>Surface</option>
      </select>
    </td>
  </tr>
  <tr>
    <td>
      <input class="resolution" type="range" min="4" max="80" value="6" />
    </td>
  </tr>
</table>
`;
// ----------------------------------------------------------------------------
// Standard rendering code setup
// ----------------------------------------------------------------------------

const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
  background: [0, 0, 0],
});
const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();

const fpsMonitor = vtkFPSMonitor.newInstance();
const fpsElm = fpsMonitor.getFpsMonitorContainer();
fpsElm.style.position = 'absolute';
fpsElm.style.left = '10px';
fpsElm.style.bottom = '10px';
fpsElm.style.background = 'rgba(255,255,255,0.5)';
fpsElm.style.borderRadius = '5px';

fpsMonitor.setContainer(document.querySelector('body'));
fpsMonitor.setRenderWindow(renderWindow);

fullScreenRenderer.setResizeCallback(fpsMonitor.update);

// ----------------------------------------------------------------------------
// Example code
// ----------------------------------------------------------------------------
// create a filter on the fly, sort of cool, this is a random scalars
// filter we create inline, for a simple cone you would not need
// this
// ----------------------------------------------------------------------------

const coneSource = vtkConeSource.newInstance({
  center: [0, 500000, 0],
  height: 1.0,
});
var polyData = coneSource.getOutputData()
polyData.buildCells()

// 读取json文件
import labelData from '../json/myObject.json';
console.log('data:', labelData);


// 渲染
renderPolyDataByLabel(polyData, labelData);
// console.log('polydata, labeldata:', polyData, labelData)
// console.log('scalars:', polyData.getCellData().getScalars().getData())

//创建一个filter用于预处理dataset的数据
const filter = vtkCalculator.newInstance();

// 将filter连接到dataset
filter.setInputConnection(coneSource.getOutputPort());



// 设计filter的处理程序
// filter.setFormulaSimple(FieldDataTypes.CELL, [], 'random', () => Math.random());


const mapper = vtkMapper.newInstance();
mapper.setInputConnection(filter.getOutputPort());

const actor = vtkActor.newInstance();
actor.setMapper(mapper);
actor.setPosition(500000.0, 0.0, 0.0);

renderer.addActor(actor);
renderer.resetCamera();
renderWindow.render();
fpsMonitor.update();



// ----------------------------------------------------------------------------
// create a sphere to indicate the pick position
// ----------------------------------------------------------------------------
const sphere = vtkSphereSource.newInstance();
const sphereMapper = vtkMapper.newInstance();
sphereMapper.setInputData(sphere.getOutputData());
const sphereActor = vtkActor.newInstance();
sphereActor.setMapper(sphereMapper);
sphereActor.getProperty().setColor(0.0, 1.0, 0.0);
// renderer.addActor(sphereActor);


// ----------------------------------------------------------------------------
// create a flag to indicate if the mouse is down
// ----------------------------------------------------------------------------
var isRightMousePressed = false;


// ----------------------------------------------------------------------------
// Setup picking interaction
// ----------------------------------------------------------------------------
// Only try to pick cone
const picker = vtkCellPicker.newInstance();
picker.setPickFromList(1);
picker.setTolerance(0);
picker.initializePickList();
picker.addPickList(actor);


// Pick on mouse right click
renderWindow.getInteractor().onRightButtonPress((callData) => {
  isRightMousePressed = true;

  if (renderer !== callData.pokedRenderer) {
    return;
  }

  const pos = callData.position;
  const point = [pos.x, pos.y, 0.0];
  console.log(`Pick at: ${point}`);
  picker.pick(point, renderer);

  if (picker.getActors().length === 0) {
    const pickedPoint = picker.getPickPosition();
    console.log(`No cells picked, default: ${pickedPoint}`);
    const sphere = vtkSphereSource.newInstance();
    sphere.setCenter(pickedPoint);
    sphere.setRadius(0.01);
    const sphereMapper = vtkMapper.newInstance();
    sphereMapper.setInputData(sphere.getOutputData());
    const sphereActor = vtkActor.newInstance();
    sphereActor.setMapper(sphereMapper);
    sphereActor.getProperty().setColor(1.0, 0.0, 0.0);
    renderer.addActor(sphereActor);
  } else {
    const pickedCellId = picker.getCellId();
    console.log('Picked cell: ', pickedCellId);

    // 编辑cell
    // drawCell(polyData, pickedCellId, labelData);

    const pickedPoints = picker.getPickedPositions();

    // 更新球体位置
    const pickedPoint = pickedPoints[0];
    console.log(`Picked: ${pickedPoint}`);
    sphere.setCenter(pickedPoint);
    sphere.setRadius(0.01);
    sphereMapper.setInputData(sphere.getOutputData());
    // sphereActor.setMapper(sphereMapper);
    renderer.addActor(sphereActor);
    // datascoure数据更新时，只需更新到mapper的连接，再addactor,其余可在初始化时设置好
    

    // for (let i = 0; i < pickedPoints.length; i++) {
    //   const pickedPoint = pickedPoints[i];
    //   console.log(`Picked: ${pickedPoint}`);
    //   const sphere = vtkSphereSource.newInstance();
    //   sphere.setCenter(pickedPoint);
    //   sphere.setRadius(0.01);
    //   const sphereMapper = vtkMapper.newInstance();
    //   sphereMapper.setInputData(sphere.getOutputData());
    //   const sphereActor = vtkActor.newInstance();
    //   sphereActor.setMapper(sphereMapper);
    //   sphereActor.getProperty().setColor(0.0, 1.0, 0.0);
    //   renderer.addActor(sphereActor);
    // }
  }
  renderWindow.render();
});






// Pick on mouse move
renderWindow.getInteractor().onMouseMove((callData) => {
  if (renderer !== callData.pokedRenderer) {
    return;
  }

  if (isRightMousePressed == false){ 

  }
  else{
      const pos = callData.position;
      const point = [pos.x, pos.y, 0.0];
      console.log(`Pick at: ${point}`);
      picker.pick(point, renderer);

      if (picker.getActors().length === 0) {

      }
      else{
        const pickedCellId = picker.getCellId();
        console.log('Picked cell: ', pickedCellId);

        // 编辑cell
        drawCell(polyData, pickedCellId, labelData);

        const pickedPoints = picker.getPickedPositions();

        // 更新球体位置
        const pickedPoint = pickedPoints[0];
        console.log(`Picked: ${pickedPoint}`);
        sphere.setCenter(pickedPoint);
        sphere.setRadius(0.01);
        sphereMapper.setInputData(sphere.getOutputData());
        sphereActor.setMapper(sphereMapper);
        renderer.addActor(sphereActor);
  }

  }
  renderWindow.render();
});


// Pick on mouse release
renderWindow.getInteractor().onRightButtonRelease((callData) => {
  isRightMousePressed = false;
});


// -----------------------------------------------------------
// UI control handling
// -----------------------------------------------------------

fullScreenRenderer.addController(controlPanel);
const representationSelector = document.querySelector('.representations');
const resolutionChange = document.querySelector('.resolution');

representationSelector.addEventListener('change', (e) => {
  const newRepValue = Number(e.target.value);
  actor.getProperty().setRepresentation(newRepValue);
  renderWindow.render();
  fpsMonitor.update();
});

resolutionChange.addEventListener('input', (e) => {
  const resolution = Number(e.target.value);
  coneSource.setResolution(resolution);
  renderWindow.render();
  fpsMonitor.update();
});

// -----------------------------------------------------------
// Make some variables global so that you can inspect and
// modify objects in your browser's developer console:
// -----------------------------------------------------------

global.source = coneSource;
global.mapper = mapper;
global.actor = actor;
global.renderer = renderer;
global.renderWindow = renderWindow;