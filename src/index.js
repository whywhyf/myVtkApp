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
import vtkOBJReader from '@kitware/vtk.js/IO/Misc/OBJReader';
import vtkHttpDataSetReader from "@kitware/vtk.js/IO/Core/HttpDataSetReader"
import vtkXMLPolyDataReader from "@kitware/vtk.js/IO/XML/XMLPolyDataReader"
import { FieldAssociations } from '@kitware/vtk.js/Common/DataModel/DataSet/Constants';
import vtkMath from '@kitware/vtk.js/Common/Core/Math';
import { mat4 } from 'gl-matrix';
import { throttle } from '@kitware/vtk.js/macros';
import vtkMatrixBuilder from '@kitware/vtk.js/Common/Core/MatrixBuilder';
// import自定义的函数
import { renderPolyDataCellByLabel, renderPolyDataPointByLabel, drawCell, drawPoint, drawPointbyPointIds } from './render'
import { L } from '@kitware/vtk.js/macros2';
import { obj } from '@kitware/vtk.js/macros';
import vtkSelectionNode from '@kitware/vtk.js/Common/DataModel/SelectionNode';
import { Filter } from '@kitware/vtk.js/Rendering/OpenGL/Texture/Constants';
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';
import vtkPoints from '@kitware/vtk.js/Common/Core/Points';
import vtkPolyLine from '@kitware/vtk.js/Common/DataModel/PolyLine';

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
// Create DOM tooltip
// ----------------------------------------------------------------------------
const tooltipsElem = document.createElement('div');
tooltipsElem.style.position = 'absolute';
tooltipsElem.style.top = 0;
tooltipsElem.style.left = 0;
tooltipsElem.style.padding = '10px';
tooltipsElem.style.zIndex = 1;
tooltipsElem.style.background = 'white';
tooltipsElem.style.textAlign = 'center';

const positionTooltipElem = document.createElement('div');
const fieldIdTooltipElem = document.createElement('div');
const compositeIdTooltipElem = document.createElement('div');
const propIdTooltipElem = document.createElement('div');
tooltipsElem.appendChild(positionTooltipElem);
tooltipsElem.appendChild(propIdTooltipElem);
tooltipsElem.appendChild(fieldIdTooltipElem);
tooltipsElem.appendChild(compositeIdTooltipElem);

document.querySelector('body').appendChild(tooltipsElem);
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

// const coneSource = vtkConeSource.newInstance({
//   center: [0, 500000, 0],
//   height: 1.0,
// });
// var polyData = coneSource.getOutputData()
// polyData.buildCells()

// 读取json文件
// import labelData from '../json/myObject.json';
// console.log('data:', labelData);


// ----------------------------------------------------------------------------
// request obj from backend
// ----------------------------------------------------------------------------
let polyTeeth = null;
let labelTeeth = null;
let colorArray = null;
const teethMapper = vtkMapper.newInstance();
const teethActor = vtkActor.newInstance();

// 用于颜色渲染的filter
const filter = vtkCalculator.newInstance()
// console.log(filter)

filter.setFormula({
  getArrays: (inputDataSets) => ({
    input: [{ location: FieldDataTypes.COORDINATE }], // Require point coordinates as input
    output: [

      {
        location: FieldDataTypes.POINT, // This array will be field data ...
        name: 'temperature', // ... with the given name ...
        dataType: 'Float32Array', // ... of this type ...
        attribute: AttributeTypes.SCALARS, // ... and will be marked as the default scalars.
        numberOfComponents: 1, // ... with this many components ...
      },
    ],
  }),
  evaluate: (arraysIn, arraysOut) => {
    // Convert in the input arrays of vtkDataArrays into variables
    // referencing the underlying JavaScript typed-data arrays:
    const [coords] = arraysIn.map((d) => d.getData());
    const [temp] = arraysOut.map((d) => d.getData());

    // Since we are passed coords as a 3-component array,
    // loop over all the points and compute the point-data output:
    // console.log(1)
    for (let i = 0, sz = coords.length / 3; i < sz; ++i) {

      if (labelTeeth != null) {
        if (labelTeeth['labels'][i] == 0) {
          temp[i] = 0.2
        } else {
          temp[i] = 0.8
        }
      }

    }
    // Mark the output vtkDataArray as modified
    arraysOut.forEach((x) => x.modified());
  },
});


console.log('downloaing polydata...')
fetch('http://127.0.0.1:8000/polyData/')
  .then(response => response.json())
  .then(data => {
    // 在这里处理从后端获取的数据 
    var polyDataString = data['polyData']
    // console.log('success', data['polyData']); 

    // 创建一个XML reader  
    var reader = vtkXMLPolyDataReader.newInstance();

    // 将polydata字符串以arraybuffer形式解析
    const arrayBuffer = base64ToArrayBuffer(polyDataString)
    // console.log(arrayBuffer)
    reader.parseAsArrayBuffer(arrayBuffer);

    // 获取解析后的PolyData对象  
    polyTeeth = reader.getOutputData(0);
    // console.log(polyTeeth.getNumberOfPoints())
    global.polyTeeth = polyTeeth
    // let b = JSON.parse(JSON.stringify(polyTeeth));
    if (!polyTeeth.getCells()) {
      polyTeeth.buildCells();
    }
    labelTeeth = data['labelData']
    // console.log(labelTeeth)

    // 根据json渲染模型
    // renderPolyDataPointByLabel(polyTeeth, labelTeeth)
    // colorArray = polyTeeth.getPointData().getScalars();


    // 连接到actor并渲染
    filter.setInputData(polyTeeth)
    teethActor.setMapper(teethMapper);
    teethMapper.setInputConnection(filter.getOutputPort());
    renderer.addActor(teethActor)
    renderer.resetCamera();
    renderWindow.render();
    console.log('rendering success')




  })
// .catch(error => {  
//   // 在这里处理发生的错误  
//   console.error('发生错误:', error);  
// });  


// 将base64编码的字符串编码为arraybuffer
function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}


renderer.resetCamera();
renderWindow.render();
fpsMonitor.update();


// ----------------------------------------------------------------------------
// Create rendering infrastructure
// ----------------------------------------------------------------------------
const interactor = renderWindow.getInteractor();
const apiSpecificRenderWindow = interactor.getView();


// ----------------------------------------------------------------------------
// Create hardware selector
// ----------------------------------------------------------------------------
const hardwareSelector = apiSpecificRenderWindow.getSelector();
hardwareSelector.setCaptureZValues(true);
// TODO: bug in FIELD_ASSOCIATION_POINTS mode
// hardwareSelector.setFieldAssociation(
//   FieldAssociations.FIELD_ASSOCIATION_POINTS
// );
hardwareSelector.setFieldAssociation(FieldAssociations.FIELD_ASSOCIATION_CELLS);



// ----------------------------------------------------------------------------
// create a sphere to indicate the pick position
// ----------------------------------------------------------------------------
const sphere = vtkSphereSource.newInstance();
const sphereMapper = vtkMapper.newInstance();
sphereMapper.setInputData(sphere.getOutputData());
const sphereActor = vtkActor.newInstance();
sphereActor.setMapper(sphereMapper);
sphereActor.getProperty().setColor(1.0, 0.0, 0.0);
// renderer.addActor(sphereActor);


// ----------------------------------------------------------------------------
// create a flag to indicate if the mouse is down
// ----------------------------------------------------------------------------
let isRightMousePressed = false;


// ----------------------------------------------------------------------------
// Setup picking interaction
// ----------------------------------------------------------------------------
// Only try to pick cone
// const picker = vtkCellPicker.newInstance();
// picker.setPickFromList(1);
// picker.setTolerance(0);
// picker.initializePickList();
// picker.addPickList(TeethActor);


// Pick on mouse right click
renderWindow.getInteractor().onRightButtonPress((callData) => {
  isRightMousePressed = true;
  return;
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
    drawPoint(polyTeeth, pickedCellId, labelTeeth);

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

// fullScreenRenderer.addController(controlPanel);
// const representationSelector = document.querySelector('.representations');
// const resolutionChange = document.querySelector('.resolution');

// representationSelector.addEventListener('change', (e) => {
//   const newRepValue = Number(e.target.value);
//   actor.getProperty().setRepresentation(newRepValue);
//   renderWindow.render();
//   fpsMonitor.update();
// });

// resolutionChange.addEventListener('input', (e) => {
//   const resolution = Number(e.target.value);
//   coneSource.setResolution(resolution);
//   renderWindow.render();
//   fpsMonitor.update();
// });

// -----------------------------------------------------------
// Make some variables global so that you can inspect and
// modify objects in your browser's developer console:
// -----------------------------------------------------------

// global.source = coneSource;
global.polyTeeth = polyTeeth;
global.teethMapper = teethMapper;
global.teethActor = teethActor;
global.renderer = renderer;
global.renderWindow = renderWindow;


// ----------------------------------------------------------------------------
// Create Picking pointer
// ----------------------------------------------------------------------------

const pointerSource = vtkSphereSource.newInstance({
  phiResolution: 15,
  thetaResolution: 15,
  radius: 0.01,
});
const pointerMapper = vtkMapper.newInstance();
const pointerActor = vtkActor.newInstance();
pointerActor.setMapper(pointerMapper);
pointerMapper.setInputConnection(pointerSource.getOutputPort());


// ----------------------------------------------------------------------------
// Create pick face indicater
// ----------------------------------------------------------------------------
const polyFace = vtkPolyData.newInstance()
global.polyFace = polyFace
const faceMapper = vtkMapper.newInstance();
const faceActor = vtkActor.newInstance();
faceActor.setMapper(faceMapper);


// renderer.addActor(faceActor)

// -----------------------------------------------------------
// selection by hardware
// -----------------------------------------------------------

// 在鼠标事件上进行拾取的函数  
function pickOnMouseEvent(event) {
  if (interactor.isAnimating()) {
    // 在场景交互期间阻止拾取  
    return;
  }
  const [x, y] = eventToWindowXY(event);

  // 隐藏指针角色并启动基于硬件的拾取  
  // pointerActor.setVisibility(false);  
  hardwareSelector.getSourceDataAsync(renderer, x, y, x, y).then((result) => {
    if (result) {
      processSelections(result.generateSelection(x, y, x, y));
    } else {
      processSelections(null);
    }
  });
}

// 限制鼠标事件处理的频率以提高性能
const throttleMouseHandler = throttle(pickOnMouseEvent, 20);
// 添加鼠标移动的事件监听器 
document.addEventListener('mousemove', throttleMouseHandler);

// document.addEventListener('contextmenu', throttleMouseHandler);
// ----------------------------------------------------------------------------
// Create Mouse listener for picking on mouse move
// ----------------------------------------------------------------------------
function eventToWindowXY(event) {
  // We know we are full screen => window.innerXXX
  // Otherwise we can use pixel device ratio or else...
  const { clientX, clientY } = event;
  const [width, height] = apiSpecificRenderWindow.getSize();
  const x = Math.round((width * clientX) / window.innerWidth);
  const y = Math.round(height * (1 - clientY / window.innerHeight)); // Need to flip Y
  return [x, y];
}


// ----------------------------------------------------------------------------
// process selection
// ----------------------------------------------------------------------------
function processSelections(selections) {
  // 如果没有进行选择，则重置actor颜色和工具提示
  // renderer.getActors().forEach((a) => a.getProperty().setColor(...WHITE));
  if (!selections || selections.length === 0) {
    lastProcessedActor = null;
    updateAssociationTooltip();
    updateCursor();
    updateCompositeAndPropIdTooltip();
    return;
  }

  // 从第一个选择中提取属性
  // 此时已选中目标
  // console.log(selections.length)
  // let i = 0;
  // for (let i = 0;i<selections.length;i++){
  //   if (selections[i].getProperties().compositeID==1){console.log('ok');return}
  // }
  const {
    worldPosition: rayHitWorldPosition,
    compositeID,
    prop,
    propID,
    attributeID,
  } = selections[0].getProperties();

  // 更新复合ID和属性ID的工具提示
  updateCompositeAndPropIdTooltip(compositeID, propID);

  let closestCellPointWorldPosition = [...rayHitWorldPosition];
  if (attributeID || attributeID === 0) {
    const input = prop.getMapper().getInputData();
    if (!input.getCells()) {
      input.buildCells();
    }

    // Get matrices to convert coordinates: (prop coordinates) <-> (world coordinates)
    const glTempMat = mat4.fromValues(...prop.getMatrix());
    mat4.transpose(glTempMat, glTempMat);
    const propToWorld = vtkMatrixBuilder.buildFromDegree().setMatrix(glTempMat);
    mat4.invert(glTempMat, glTempMat);
    const worldToProp = vtkMatrixBuilder.buildFromDegree().setMatrix(glTempMat);
    // Compute the position of the cursor in prop coordinates
    const propPosition = [...rayHitWorldPosition];
    worldToProp.apply(propPosition);

    if (
      // 判断硬件选择器的配置项
      hardwareSelector.getFieldAssociation() ===
      FieldAssociations.FIELD_ASSOCIATION_POINTS
    ) {
      // Selecting points
      // 如果硬件选择器配置选择point
      closestCellPointWorldPosition = [
        ...input.getPoints().getTuple(attributeID),
      ];
      propToWorld.apply(closestCellPointWorldPosition);
      updateAssociationTooltip('Point', attributeID);
    } else {
      // Selecting cells
      // 如果硬件选择器配置选择cell
      const cellPoints = input.getCellPoints(attributeID);
      updateAssociationTooltip('Cell', attributeID);

      // 如果此时有按下右键，根据cellid更新渲染
      // drawPoint(polyTeeth, attributeID, labelTeeth);

      if (cellPoints) {
        const pointIds = cellPoints.cellPointIds;

        // 如果此时有按下右键，根据pointids更新渲染
        if (isRightMousePressed) {
          // 如果获取到了这个指示器，就不要新建指示器
          if (pointIds[0] == 0 || pointIds[0] == 1 || pointIds[0] == 2) { return }

          // 获取points的坐标
          let num = 0
          const facePoints = []
          const faceLines = [2, 0, 1, 2, 0, 2, 2, 1, 2]
          for (let pointId of pointIds) {
            const xyz = polyTeeth.getPoints().getPoint(pointId)
            facePoints.push(xyz[0], xyz[1], xyz[2])

          }
          // console.log('pointids', pointIds)




          // 创建一个新的polydata并覆盖在模型上
          // const polyFace = vtkPolyData.newInstance()
          polyFace.getPoints().setData(Float32Array.from(facePoints), 3);
          polyFace.getLines().setData(Uint16Array.from(faceLines));
          // console.log('facepoints', facePoints)
          // polyFace.buildCells()
          polyFace.modified()
          // teethActor.setVisibility(false)
          faceMapper.setInputData(polyFace)
          renderer.addActor(faceActor)
          drawPointbyPointIds(polyTeeth, pointIds, labelTeeth)
        }

        // Find the closest cell point, and use that as cursor position
        const points = Array.from(pointIds).map((pointId) =>
          input.getPoints().getPoint(pointId)
        );
        const distance = (pA, pB) =>
          vtkMath.distance2BetweenPoints(pA, propPosition) -
          vtkMath.distance2BetweenPoints(pB, propPosition);
        const sorted = points.sort(distance);
        closestCellPointWorldPosition = [...sorted[0]];
        propToWorld.apply(closestCellPointWorldPosition);
      }
    }
  }
  lastProcessedActor = prop;
  // Use closestCellPointWorldPosition or rayHitWorldPosition
  updateCursor(closestCellPointWorldPosition);

  // Make the picked actor green
  // prop.getProperty().setColor(...GREEN);

  // We hit the glyph, let's scale the picked glyph
  // if (prop === cylinderActor) {
  //   scaleArray.fill(0.5);
  //   scaleArray[compositeID] = 0.7;
  //   cylinderPointSet.modified();
  //   needGlyphCleanup = true;
  // } else if (needGlyphCleanup) {
  //   needGlyphCleanup = false;
  //   scaleArray.fill(0.5);
  //   cylinderPointSet.modified();
  // }
  renderWindow.render();
}


// ----------------------------------------------------------------------------
// 更新tooltip中的compositeID, propID
// ----------------------------------------------------------------------------
let needGlyphCleanup = false;
let lastProcessedActor = null;

const updatePositionTooltip = (worldPosition) => {
  if (lastProcessedActor) {
    positionTooltipElem.innerHTML = `Position: ${worldPosition
      .map((v) => v.toFixed(3))
      .join(' , ')}`;
  } else {
    positionTooltipElem.innerHTML = '';
  }
};


const updateCompositeAndPropIdTooltip = (compositeID, propID) => {
  if (compositeID !== undefined) {
    compositeIdTooltipElem.innerHTML = `Composite ID: ${compositeID}`;
  } else {
    compositeIdTooltipElem.innerHTML = '';
  }
  if (propID !== undefined) {
    propIdTooltipElem.innerHTML = `Prop ID: ${propID}`;
  } else {
    propIdTooltipElem.innerHTML = '';
  }
};


const updateAssociationTooltip = (type, id) => {
  if (type !== undefined && id !== undefined) {
    fieldIdTooltipElem.innerHTML = `${type} ID: ${id}`;
  } else {
    fieldIdTooltipElem.innerHTML = '';
  }
};


const updateCursor = (worldPosition) => {
  if (lastProcessedActor) {
    pointerActor.setVisibility(true);
    pointerActor.setPosition(worldPosition);
  } else {
    pointerActor.setVisibility(false);
  }
  renderWindow.render();
  updatePositionTooltip(worldPosition);
};