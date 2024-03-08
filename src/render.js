import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";


// 根据点id和data设置cell的颜色
export function renderPolyDataByLabel(polyData, labelData){
    // 设置颜色 用dataarray存储颜色标量
    var emptyArray = vtkDataArray.newInstance({ empty: true });
    // scalars连接到data
    polyData.getCellData().setScalars(emptyArray)
    console.log('empty:', emptyArray.getData())
    // 遍历cell 进行渲染
    for (let cellId = 0; cellId < polyData.getNumberOfCells(); cellId++){
        var num = 0;
        var cellPointIds = polyData.getCellPoints(cellId)['cellPointIds']
        var numPoints = cellPointIds.length
        var isTeeth = true;
        for (const pointId of cellPointIds){
        // console.log(labelData)
        // console.log(labelData['label'][pointId])
        if (labelData['label'][pointId] == 0){ num++;}
        }
    
        if (num > numPoints / 2){ isTeeth = false}
    
        // 改变颜色array
        // console.log(labelData)
        console.log('cell',cellId,'isTeeth:', isTeeth)
        if (isTeeth){
        emptyArray.insertNextTuple([0.9])
        }
        else{
        emptyArray.insertNextTuple([0.2])
        }
        // 把scalars连接到data
        
        // console.log('colorsarray:', emptyArray.getData())
    
        // 更新emptyArray
        // emptyArray.dataChange()
        // emptyArray.modified()
    
        // 更新polyData
        // polyData.modified()
    }
    console.log('empty:', emptyArray.getData())
    }


export function drawCell(polyData, cellId, labelData){
    // 从polydata的cell获取其点id array
    var cellPointIds = polyData.getCellPoints(cellId)['cellPointIds']
    // 获取scalars设置颜色 用dataarray存储颜色标量
    var emptyArray = polyData.getCellData().getScalars();

    // 改变该cell的点的label
    for (let pointId of cellPointIds){
        labelData['label'][pointId] = 1; 
    }
    // console.log(labelData)

    // 改变颜色array
    emptyArray.setTuple(cellId,[0.9])

    // 更新emptyArray
    emptyArray.dataChange()
    // emptyArray.modified()

    // 更新polyData
    polyData.modified()

    // 渲染  
    // renderWindow.update()
    renderWindow.render();  
}