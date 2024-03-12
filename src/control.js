import vtkAppendPolyData from '@kitware/vtk.js/Filters/General/AppendPolyData';


// ----------------------------------------------------------------------------
// 提交目前的操作并清理内存
// ----------------------------------------------------------------------------
export function commitHandler(polyTeeth, faceActor, allPolyFace, renderer, window) {
    console.log('commit!')
    polyTeeth.modified()
    renderer.removeActor(faceActor)

    // 内存释放
    for (let polyData of allPolyFace.get().inputData) {
        polyData.delete()
        // console.log('=',polyData===polyFace)
    }
    allPolyFace.delete()
    allPolyFace = vtkAppendPolyData.newInstance()
    renderWindow.render()
    // resetWidgets();
    // scene.renderWindow.render();
    return allPolyFace
}