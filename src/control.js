import vtkAppendPolyData from '@kitware/vtk.js/Filters/General/AppendPolyData';




// ----------------------------------------------------------------------------
// 定义命令类
// ---------------------------------------------------------------------------- 
export class LabelCommand {
    constructor(labelArray) {
        this.labelArray = labelArray

    }

    redoFunc() {
        for (let i = 0; i < this.indexArray.length; i++) {
            this.labelArray[this.indexArray[i]] = this.newValueArray[i]
        }
    }

    // 撤销，必须倒序，因为有重复操作的问题
    undoFunc() {
        for (let i = this.indexArray.length - 1; i >= 0; i--) {
            this.labelArray[this.indexArray[i]] = this.oldValueArray[i]
        }
    }

    // push一次操作内容
    inputArray(indexArray, oldValueArray, newValueArray) {
        this.indexArray = [...indexArray]
        this.oldValueArray = [...oldValueArray]
        this.newValueArray = [...newValueArray]
    }
}


// ----------------------------------------------------------------------------
// 定义命令管理器类
// ---------------------------------------------------------------------------- 
export class CommandAdmin {
    constructor() {
        // 栈式管理
        this.history = []
        this.index = -1
        this.canUndo = false
        this.canRedo = false
        // 最多记录50步
        this.maxHistoryLength = 50
    }

    pushCommand(labelCommand) {
        this.history = this.history.slice(0, this.index + 1);
        this.history.push(labelCommand)
        this.index++
        this.canUndo = true
        this.canRedo = false
        // 检查栈的长度，如果超过了限制，移除最早的操作  
        if (this.history.length > this.maxHistoryLength) {
            this.history.shift();
            this.index--
        }
    }

    undoCommand() {
        this.history[this.index].undoFunc()
        this.index--
        this.canRedo = true
        if (this.index == -1) { this.canUndo = false }
    }

    redoCommand() {
        this.index++
        this.history[this.index].redoFunc()
        this.canUndo = true
        if (this.index == this.history.length - 1) { this.canRedo = false }
    }



}


// ----------------------------------------------------------------------------
// 提交目前的操作并清理内存
// ----------------------------------------------------------------------------
export function commitHandler(polyTeeth, faceActor, allPolyFace, renderer, window) {

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


// ----------------------------------------------------------------------------
// 撤销目前的操作并清理内存
// ----------------------------------------------------------------------------
export function undoHandler() {

}