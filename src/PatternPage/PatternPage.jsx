import React, { Component } from 'react';

import { userService, authenticationService,  } from '@/_services';

import defaultCellRangeRenderer from './defaultCellRangeRenderer.js'
import Grid from './Grid.js'

import { AutoSizer} from "react-virtualized";


function getMapSize(x) {
  var len = 0;
  for (var count in x) {
          len++;
  }

  return len;
}


class PatternPage extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            currentUser: authenticationService.currentUserValue
        };
    }

    componentDidMount() {
        userService.getPattern(this.props.match.params.id).then(pattern => this.setState({ pattern }));
    }

    render() {
        
        const { currentUser, pattern } = this.state;
        let parsePattern
        if(pattern){
            parsePattern = JSON.parse(pattern.pattern)
            console.log('pattern',parsePattern)
        }
        return (
            <div>                
                {parsePattern && <Pattern colorGrid = {parsePattern.colorGrid}
                                     stitchHeight = {parsePattern.stitchHeight}
                                     stitchWidth = {parsePattern.stitchWidth}
                                     patternId = {this.props.match.params.id}
                                     colors = {parsePattern.colors || []}
                            >
                </Pattern>}
            </div>)
    }
}

export { PatternPage }; 

const maxWidth = 2000;
const maxHeight = 2000;
const maxStitchWidth = 100;
const maxStitchHeight = 100;
// TODO capitalize
// TODO  - zoom
// TODO - messaging system for successful saves

const actions = {
    PENCIL: 'pencil',
    ARROW: 'arrow',
    SELECTION: 'selection',
    BUCKET: 'bucket',
    SQUARE: 'square',
    DROPPER: 'dropper',
    ROWTRACKER: 'rowtracker',
  }
   
  function cornerToBounds(corner1,corner2,corner3=null) {
    var [x1,y1] = keyToXY(corner1);
    var [x2,y2] = keyToXY(corner2);
    var [x3,y3] = [x1,y1];
    if(corner3!=null) {
      [x3,y3] = keyToXY(corner3);
    }
    var leftx = Math.min(x1,x2,x3)
    var rightx = Math.max(x1,x2,x3)+1
    var topy = Math.min(y1,y2,y3)
    var bottomy = Math.max(y1,y2,y3)+1
    return [leftx,topy,rightx,bottomy]
  }
  
  
  
  function renderColorBox(index, color, selected, onClick) {
    var classes = "color-box"
    if (selected) {
        classes += " selected-box"
    }
    return (
        <div className = {classes}
            style = {{backgroundColor: color}}
            key = {color}
            onClick={() => onClick(color)}
        >{index+1}
        </div>
    )
  }
  
  function keyToXY(key) {
    const [yStr, xStr] = key.split("-");
    return [parseInt(xStr),parseInt(yStr)]
  }
  
  function make2DArray(_width,_height,filling) {
    var array = []
    for (var y = 0; y < _height; y++) {
        array.push(Array(_width).fill(filling));
    }
    return array
  }
  
  
  
class Pattern extends Component {
    constructor(props) {
      // props must include colorGrid, stitchHeight/Width
      const initHeight = props.colorGrid.length
      const initWidth = props.colorGrid[0].length
      super(props);
      this.state = {
          selectedColor: null,
          colors: props.colors,
          action: actions.PENCIL,
          dragging: false,
          selectedBox: null,
          selection:  make2DArray(initWidth, initHeight, false),
          corner2: null,
          cellCache: {},
          changedCells: new Set(),
          allCellsChanged: true,
          shape: "purl",
          width: initWidth,
          height: initHeight,
          stitchWidth: props.stitchWidth,
          stitchHeight: props.stitchHeight,
          pattern: {
              id: props.patternId,
              colorGrid: props.colorGrid,
              shapeGrid: make2DArray(initWidth, initHeight, "purl"),
              width: initWidth,
              height: initHeight,
              stitchWidth: props.stitchWidth, // pixel width of individual stitch
              stitchHeight: props.stitchHeight,
              selectedBox: 0,
          },
          clipboard: null,
          snapshots: [],
          snapshotIndex: -1,
  
          dragTopRuler: false,
          startY: null,
          topRulerMargin: 0,
          topRulerMarginStart: 0,
  
          dragLeftRuler: false,
          leftRulerMargin: 0,

          pencilPriorCells: {},
          reverseRuler: true,
          isRowTracking: false,
          rowTracker: 0,
      }
  
      this.changeColor = this.changeColor.bind(this);
      this.changeWidth = this.changeWidth.bind(this);
      this.changeHeight = this.changeHeight.bind(this);
      this.changeStitchWidth = this.changeStitchWidth.bind(this);
      this.changeStitchHeight = this.changeStitchHeight.bind(this);
      this.copy = this.copy.bind(this);
      this.clickStitchify = this.clickStitchify.bind(this);
      this.clickPencil = this.clickPencil.bind(this);
      this.clickCopy = this.clickCopy.bind(this);
      this.clickPaste = this.clickPaste.bind(this);
      this.clickSelect = this.clickSelect.bind(this);
      this.clickBucket = this.clickBucket.bind(this);
      this.clickSquare = this.clickSquare.bind(this);
      this.clickSave = this.clickSave.bind(this);
      this.addColor = this.addColor.bind(this);
      this.keydownHandler = this.keydownHandler.bind(this);
      this.takeSnapshot = this.takeSnapshot.bind(this);
      this.undoSnapshot = this.undoSnapshot.bind(this);
      this.copyPattern = this.copyPattern.bind(this);
      this.classyButton = this.classyButton.bind(this);
      this.cellRenderer = this.cellRenderer.bind(this);
      this.cellRangeRenderer = this.cellRangeRenderer.bind(this);
  
  }
  
  classyButton(onClick, text, name=null) {
    var classes = "classy-button";
    if(this.state.action == name) {
      classes += " clicked";
    }
    return (
      <button type="submit" className={classes} onClick={onClick} value={text}>{text}</button>
    )
  }
  
  changeColor(event) {
      this.setState({selectedColor: event.target.value});
  }
  
  changeStitchWidth(event) {
    var newStitchWidth = Math.max(Math.min(maxStitchWidth,parseInt(event.target.value) || 1),1)
    const pattern = {...this.state.pattern}
    pattern.stitchWidth = newStitchWidth
    this.setState({stitchWidth: event.target.value, pattern: pattern, allCellsChanged:true})
  }

  changeStitchHeight(event) {
    var newStitchHeight = Math.max(Math.min(maxStitchHeight, parseInt(event.target.value) || 1),1)
    const pattern = {...this.state.pattern}
    pattern.stitchHeight = newStitchHeight
    this.setState({stitchHeight: event.target.value, pattern: pattern, allCellsChanged:true})
  }
  
  changeWidth(event) {
      var newWidth = Math.max(Math.min(maxWidth,parseInt(event.target.value) || 1),1)
      var pattern = {...this.state.pattern};
      var copied = this.copy()
      pattern.width = newWidth;
      pattern.colorGrid = make2DArray(pattern.width, pattern.height, "#e3e3e3");
      pattern.shapeGrid = make2DArray(pattern.width, pattern.height, "purl");
      var pasted_pattern = this.paste(copied, pattern, "0-0", true)
      this.setState({width: event.target.value, pattern: pasted_pattern, selection: make2DArray(pattern.width, pattern.height, false), allCellsChanged:true});
  }
  
  changeHeight(event) {
      var newHeight= Math.max(Math.min(maxHeight,parseInt(event.target.value) || 1),1)
      var pattern = {...this.state.pattern};
      var copied = this.copy()
      pattern.height = newHeight;
      pattern.colorGrid = make2DArray(pattern.width, pattern.height, "#e3e3e3");
      pattern.shapeGrid = make2DArray(pattern.width, pattern.height, "purl");
      // this.setState({pattern: pattern});
      var pasted_pattern = this.paste(copied, pattern, "0-0", true)
      this.setState({height: event.target.value, pattern: pasted_pattern, selection: make2DArray(pattern.width, pattern.height, false), allCellsChanged:true});
  }
  
  copy(corner1 = null, corner2 = null) {
      
      if (corner1 === null) {
          // by default copy the whole pattern
          // this is not a DEEP COPY
          var copied = {...this.state.pattern}
          return copied
      } 
      // this is deep
      var pattern = {}
      const [leftx,topy,rightx,bottomy] = cornerToBounds(corner1, corner2);
      var colorArray = []
      var shapeArray = []
      for (var y = topy; y < bottomy; y++) {
          var colorRow = []
          var shapeRow = []
          for (var x = leftx; x < rightx; x++) {
              colorRow.push(this.state.pattern.colorGrid[y][x])
              shapeRow.push(this.state.pattern.shapeGrid[y][x])
          }
          colorArray.push(colorRow);
          shapeArray.push(shapeRow);
      }
      pattern.colorGrid = colorArray;
      pattern.shapeGrid = shapeArray;
      pattern.width = colorArray[0].length;
      pattern.height = colorArray.length;
      return pattern
  }
  
  paste(pattern, destination, corner = "0-0", noResize = false) {
      var [leftx, topy] = keyToXY(corner);
      var bottomy = topy+pattern.height;
      var rightx = leftx+pattern.width;
  
      if((bottomy > destination.height || rightx > destination.width) && !noResize) {
        var copied = this.copy();
        destination.width = Math.max(destination.width, rightx);
        destination.height = Math.max(destination.height, bottomy);
        destination.colorGrid = make2DArray(destination.width, destination.height, "#e3e3e3");
        destination.shapeGrid = make2DArray(destination.width, destination.height, "purl");
        destination = this.paste(copied, destination);
      }
  
      var bottomy = Math.min(destination.height, topy+pattern.height)
      var rightx = Math.min(destination.width, leftx+pattern.width)
      
      for (var y = topy; y < bottomy; y++){
          for (var x = leftx; x < rightx; x++) {
              destination.colorGrid[y][x] = pattern.colorGrid[y-topy][x-leftx]
              destination.shapeGrid[y][x] = pattern.shapeGrid[y-topy][x-leftx]
          }
      }
      return destination;
  }
  
  addColor(event) {
      if (!this.state.colors.includes(this.state.selectedColor) && this.state.selectedColor != null) {
          this.setState({
              colors: this.state.colors.concat([this.state.selectedColor]),
          })
      }
  
  }
  
  clickColor(color) {
      var selectedColor = null
      if (this.state.selectedColor !== color) {
          selectedColor = color;
          if (this.state.action === actions.ARROW) {
            this.setState({action: actions.PENCIL})
          }
          this.setState({selectedColor: selectedColor})
      }
  }
  
  boxOnMouseDown(event,x,y, key) {
      event.preventDefault()
      // todo - stop selection of the width/height boxes
      // if (!event) event = window.event;
      // event.cancelBubble = true;
      // if (event.stopPropagation) event.stopPropagation();
      var selectedBox = null
      if (this.state.selectedBox !== key) {
        if (this.state.selectedBox !== null) {
          // remove previously selected box
          this.state.changedCells.add(this.state.selectedBox);
        }
        selectedBox = key;
        this.state.changedCells.add(key);
      }
  
      const pattern = {...this.state.pattern};
      switch(this.state.action) {
          case actions.PENCIL:
            if(this.state.pattern.colorGrid[y][x] === this.state.selectedColor || this.state.selectedColor === null){
              break;
            }
            this.state.changedCells.add(key);
            
            this.state.pencilPriorCells = {};
            this.state.pencilPriorCells[key] = pattern.colorGrid[y][x];
            console.log('mouse down, prior cells',this.state.pencilPriorCells)
            pattern.colorGrid[y][x] = this.state.selectedColor || pattern.colorGrid[y][x];
            
            
            this.setState({
              pattern: pattern,
            })
            break;
          case actions.SELECTION:
            this.setState({
              corner2: key,
            })
            break;
          case actions.BUCKET:
            this.paintBucket(key)
            break;
          case actions.SQUARE:
            this.setState({
              corner2: key,
            })
            break;
          default:
  
      }
      this.setState({
          dragging: true,
          selectedBox: selectedBox,
      })
  }    
  
  boxOnMouseOver(event,x, y, key) {
    
    event.preventDefault()
    
    if (!this.state.dragging) {
      return
    }
    
    const pattern = {...this.state.pattern};
    switch(this.state.action) {
      case actions.PENCIL:
        
        if(pattern.colorGrid[y][x] === this.state.selectedColor || this.state.selectedColor === null){
          return
        }
        this.state.changedCells.add(key);
        this.state.pencilPriorCells[key] = pattern.colorGrid[y][x];
        console.log("mouseover,", this.state.pencilPriorCells)
        pattern.colorGrid[y][x] = this.state.selectedColor; 
        this.setState({
          pattern: pattern,
        })
        break;
      case actions.SELECTION:
        if(key !== this.state.corner2){
          this.setState({
            corner2: key,
          })
        }
        
        break;
      case actions.SQUARE:
        // TODO - implement snapshots and then come back here
        // todo - have whole rows that don't need to be re-rendered
        if(key !== this.state.corner2){
          this.setState({
            corner2: key,
          })
        }
        break;
      default:  
    } 
  }
  
  boxOnMouseUp(event,x, y, key) {
    event.preventDefault()
    switch(this.state.action) {
      case actions.PENCIL:
        console.log("mouse up priorcells",this.state.pencilPriorCells)
        this.takeSnapshot(this.state.pencilPriorCells);
        this.state.pencilPriorCells = {};
        break;
      case actions.SQUARE:
        var pattern = {...this.state.pattern};
        console.log("mouseUpSquare", this.state.selectedBox, key)
        const [leftx,topy,rightx,bottomy] = cornerToBounds(this.state.selectedBox, key);
        var priorCells = {}
        let box_id;
        if(this.state.selectedColor === null){
          return;
        }

        for (var y = topy; y < bottomy; y++) {
            for (var x = leftx; x < rightx; x++) {
              box_id = y+'-'+x
              console.log("boxid", box_id)
              priorCells[box_id] = pattern.colorGrid[y][x]
              pattern.colorGrid[y][x] = this.state.selectedColor;
              this.state.changedCells.add(box_id);
            }
        }
        console.log("priorcells", priorCells)
        this.takeSnapshot(priorCells);
        
        this.setState({
          pattern: pattern,
          corner2: null,
          selectedBox: null,
        })
        break;
      default:
        
    }
  
    this.setState({
      dragging: false,
    })
  }
  
  universalMouseUp(event) {
    this.setState({
      dragging: false,
      dragTopRuler: false,
      dragLeftRuler: false,
    })
  }
  
  universalMouseMove(event) {
    if(this.state.dragTopRuler){
      this.setState({topRulerMargin: this.state.topRulerMarginStart+event.clientY-this.state.startY})
    }
  
    if(this.state.dragLeftRuler){
      this.setState({leftRulerMargin: this.state.leftRulerMarginStart+event.clientX-this.state.startX})
    }
  }
  
  copyPattern(pattern){
    const newPattern = {...pattern}
    const newColorGrid = []
    const newShapeGrid = []
    for(var i=0;i<pattern.height;i++) {
      newColorGrid.push({...pattern.colorGrid[i]})
      newShapeGrid.push({...pattern.shapeGrid[i]})
    }
    newPattern.colorGrid = newColorGrid
    newPattern.shapeGrid = newShapeGrid
    return newPattern
  }
  
  clickCopy() {
    if(this.state.action === actions.SELECTION){
      const pattern = this.copy(this.state.selectedBox, this.state.corner2)
      this.setState({action:actions.ARROW, clipboard: pattern, selectedColor: null, allCellsChanged:true})
      this.state.allCellsChanged = true;
    }
  }
  
  // todo - store width and height as part of snapshot when snapshoting before paste.
  // todo - instead of allCellsChanged - only change the cells that are changed
  clickPaste() {
    if(this.state.clipboard !== null) {
      var [leftx, topy] = keyToXY(this.state.selectedBox);
      var bottomy = Math.min(topy+this.state.clipboard.height, this.state.pattern.height);
      var rightx = Math.min(leftx+this.state.clipboard.width, this.state.pattern.width);
      var priorCells = {};
      let box_id;
      for (var y = topy; y < bottomy; y++) {
        for (var x = leftx; x < rightx; x++) {
          box_id = y+'-'+x
          priorCells[box_id] = this.state.pattern.colorGrid[y][x]
          this.state.changedCells.add(box_id);
        }
      }
      this.takeSnapshot(priorCells)
      const pattern = this.paste(this.state.clipboard, {...this.state.pattern}, this.state.selectedBox)
      this.setState({action:actions.ARROW, pattern:pattern, selectedColor: null, allCellsChanged: true})
    }
  }
  
  clickSelect() {
    if (this.state.action === actions.SELECTION) {
      this.setState({action: actions.PENCIL})
    } else {
      this.setState({action: actions.SELECTION, selectedBox:null, corner2:null})
    }
  }
  
  clickBucket() {
    if (this.state.action === actions.BUCKET) {
      this.setState({action: actions.PENCIL})
    } else {
      this.setState({action: actions.BUCKET})
    }
  }
  
  clickSquare() {
    if (this.state.action === actions.SQUARE) {
      this.setState({action: actions.PENCIL})
    } else {
      this.setState({ action: actions.SQUARE, selectedBox:null, corner2:null})
      
    }
  }
  
  clickPencil() {
    this.setState({action: actions.PENCIL})
  }

// todo auto-saving
  clickSave() {
    this.setState({ alert: 'Saving...' })
    const savePattern = {};
    const pattern = this.state.pattern;
    savePattern.colorGrid = pattern.colorGrid;
    savePattern.colors = this.state.colors;
    savePattern.stitchHeight = pattern.stitchHeight;
    savePattern.stitchWidth = pattern.stitchWidth;
    userService.savePattern(pattern.id, JSON.stringify(savePattern)).then(response => {
      this.setState({ alert: response.message })
    });
    
  }
  
  clickStitchify() {
    this.state.allCellsChanged = true;
    if (this.state.shape === "knit") {
      this.setState({shape: "purl"})
    } else {
      this.setState({shape: "knit"})
      
    }
  }

  // todo - delete patterns
  // todo - publish patterns
  // todo - mirror function
  // todo - color input boxes
  // todo - allow width to go down to zero
  
  keydownHandler(e){
    console.log("keyCode",e.keyCode, e.ctrlKey)
    // color hotkeys
    if(e.keyCode>=49 && e.keyCode<=57){
      var index = e.keyCode-49;
      if(this.state.colors.length>index){
        this.setState({selectedColor:this.state.colors[index]})
      }
    }
    // tool hotkeys
    if (e.ctrlKey) {  
      switch (e.keyCode){
        case 90:
          e.preventDefault()
          this.undoSnapshot()
          break;
        case 89:
          break;
        case 83:
          e.preventDefault()
          this.clickSave()      
          break;
        case 67:
          this.clickCopy()
          break;
        case 86:
          this.clickPaste()
          break;
      } 
    } else {
      switch (e.keyCode){
        case 69:
          e.preventDefault()
          this.clickSelect()
          break;
        case 81:
          this.clickSquare()
          break;
        case 66:
          e.preventDefault()
          this.clickBucket()
          break;
        case 80:
          e.preventDefault()
          this.clickPencil()
          break;
      }
    }
    this.setState({shape:this.state.shape})
  }

  // todo - button images
  componentDidMount(){
    document.addEventListener('keydown',this.keydownHandler);
    window.addEventListener('resize', () => this.setState({allCellsChanged:true}));
    // auto-save every 5 seconds
    this.interval = setInterval(() => this.clickSave(), 60000);
  }
  componentWillUnmount(){
    document.removeEventListener('keydown',this.keydownHandler);
    window.removeEventListener('resize', this.updateDimensions);
    clearInterval(this.interval);
  }
  
  // todo pixelize function
  // todo double click rulers leave
  // alerts can be dismissed, dismiss on timer
  // todo dropper/ color removal
  // potentially too slow DX
  // copying IS taking too long...
  // what if snapshot just stored differences in state... look at the static/CellCache (or have a changedCellSet)
  // for each of those we store the current cell state
  // for saving we will still want all of the relevant field
  // wait - would this require backtracking through every second of mouse movement???
  // at least through every entry of the mouse onto a new cell. Also how do we know how far back to go?
  // ok how about we don't try using snapshots/reseting for squares?
  // instead, we can use an overlay.
  // hmmm not sure how to do redo with this setup...
  // I would have to store the new state as well...
  // I'm dissapointed with the undo - it's one square at a time - it should be snapped on mouse up
  // so I wish I could snap a whole swatch at (maybe the visible portion)
  // hmm, could store changes until the next snap instead of using changedCells
  takeSnapshot(priorCells = null) {
    console.log("taking snapshot, current index:", this.state.snapshotIndex)
    if (priorCells === null) {
      priorCells = {}
      for(var key of this.state.changedCells) {
        var [x,y] = keyToXY(key);
        priorCells[key] = this.state.pattern.colorGrid[y][x];
      }
    } else if (getMapSize(priorCells) === 0) {
      // no cells to take snapshot of
      return;
    }
    
    const snapshots = this.state.snapshots.slice(0,this.state.snapshotIndex+1)
    snapshots.push(priorCells)
    const index = snapshots.length-1;
    this.setState({snapshots: snapshots, snapshotIndex:index});
  }
  
  // on undo - record which cells where changed and save that as part of the snapshots array - make it an array of snapshot indices
  undoSnapshot() {
    console.log("Undoing snap snapshotIndex",this.state.snapshotIndex)
    if (this.state.snapshotIndex < 0){
      return;
    }
    const priorCells = this.state.snapshots[this.state.snapshotIndex]
    // console.log("snapIndex and priorCells",this.state.snapshotIndex,priorCells)
    for(var key in priorCells){
      var [x,y] = keyToXY(key);
      this.state.changedCells.add(key);
      this.state.pattern.colorGrid[y][x] = priorCells[key];
    }
    this.setState({pattern:this.state.pattern, snapshotIndex:this.state.snapshotIndex-1})
  }
  
  setBoxes(pattern, func, corner1, corner2) {
      const [_leftx,_topy,_rightx,_bottomy] = cornerToBounds(corner1, corner2);
      for (var y = _topy; y < _bottomy; y++) {
          for (var x = _leftx; x < _rightx; x++) {
              func(pattern, x, y)
          }
      }
  
      return pattern
    }
  
    colorAtKey(key) {
      const [startx, starty] = keyToXY(key)
      return this.state.pattern.colorGrid[starty][startx]
    }
  
    paintBucket(start_box) {
      // recursive BFS 
      var pattern = this.state.pattern
      let visited = new Set();
      const priorCells = {}
      var color = this.colorAtKey(start_box)
      var selectedColor = this.state.selectedColor;
      if (color === selectedColor || selectedColor === null) {
        return;
      }
      var agenda = [start_box]
      visited.add(start_box);
  
      while(agenda.length !== 0) {
        
        const box_id = agenda.shift();  
        const [x, y] = keyToXY(box_id)
        priorCells[box_id] = color
        pattern.colorGrid[y][x] = selectedColor
        this.state.changedCells.add(box_id);
        // recurse on neighbors
        let child_id;
        
        for (var [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          child_id = (y+dy)+'-'+(x+dx)
          
          if (!visited.has(child_id)){
            visited.add(child_id);
            if (0<=(x+dx) && (x+dx)<pattern.width){
                if (0<=(y+dy) && (y+dy)<pattern.height){
                  if (pattern.colorGrid[y+dy][x+dx] === color) {
                    agenda.push(child_id);
                  }
                }
            }
          }
        }
        
      }
  
      this.setState({pattern:pattern})
      this.takeSnapshot(priorCells);
  }
  
  clickRulerTop(e) {
    e.preventDefault()
    this.setState({dragTopRuler:true, startY:e.clientY, topRulerMarginStart:this.state.topRulerMargin})
  }
  
  upRulerTop(e) {
    this.setState({dragTopRuler:false})
  }
  
  clickRulerLeft(e) {
    e.preventDefault()
    this.setState({dragLeftRuler:true, startX:e.clientX, leftRulerMarginStart:this.state.leftRulerMargin})
  }
  
  upRulerLeft(e) {
    this.setState({dragLeftRuler:false})
  }
  
  // todo - optimize to only update the overlay on changes
  cellRangeRenderer(props) {
    var [children, scrollTop, scrollLeft] = defaultCellRangeRenderer(props, this.state.changedCells, this.state.cellCache, this.state.allCellsChanged);
    this.state.cellCache = children;
    this.state.allCellsChanged = false;
    this.state.changedCells = new Set();
   
    var contents = [<div key="gridBox" style={{marginLeft:25+"px", marginTop:25+"px", position:"relative"}}>{children.slice()}</div>];
    if((this.state.action === actions.SELECTION || this.state.action === actions.SQUARE) && this.state.selectedBox){
  
      var backgroundColor = "blue"
      var opacity = ".5"
      if(this.state.action === actions.SQUARE){
        backgroundColor = this.state.selectedColor
        opacity = ".8"
      }
      const [leftx, topy, rightx, bottomy] = cornerToBounds(this.state.selectedBox,this.state.corner2)
      var height = this.state.pattern.stitchHeight*(bottomy-topy);
      var width = this.state.pattern.stitchWidth*(rightx-leftx);
      var overlay = (<div key="overlay" style={{position:"absolute", zIndex:"1", opacity:opacity, 
                            backgroundColor:backgroundColor, height:height, width:width,
                            left:leftx*this.state.pattern.stitchWidth+25,
                            top:topy*this.state.pattern.stitchHeight+25,
                            pointerEvents:"none"}}></div>); 
      contents.unshift(overlay)
    }

    if(this.state.isRowTracking){
      var showRow = this.state.rowTracker+1;
      var opacity = .7;
      var overlayTop = (<div key="overlayTop" style={{position:"absolute", zIndex:"1", opacity:opacity, 
                              backgroundColor:'black', height:this.state.pattern.stitchHeight*(showRow-1), width:'100%',
                              left:25,
                              top:25,
                              pointerEvents:"none"}}></div>); 
      var overlayBottom = (<div key="overlayBottom" style={{position:"absolute", zIndex:"1", opacity:opacity, 
                              backgroundColor:'black', height:'100%', width:'100%',
                              left:25,
                              top:this.state.pattern.stitchHeight*showRow+25,
                              pointerEvents:"none"}}></div>); 
      contents.unshift(overlayTop)
      contents.unshift(overlayBottom)
    }
    

  
    // todo - optimize away
    const rulerInnerLeft = [];
    for (var y=1; y<=this.state.pattern.height; y++) {
      rulerInnerLeft.push(<div key={"left"+y} style={{height:this.state.pattern.stitchHeight}}>{y}</div>)
      
      for (var i=0; i<(20/this.state.pattern.stitchHeight)-1; i++){
        if (y<this.state.pattern.height) {
          y++;
          rulerInnerLeft.push(<div key={"left"+y} style={{height:this.state.pattern.stitchHeight}}>{ }</div>);
        }
      }
    }
    const rulerInnerTop = []
    for (var x=1; x<=this.state.pattern.width; x++) {
      rulerInnerTop.push(<div key={"top"+x} style={{width:this.state.pattern.stitchWidth, float:'left', position:'relative'}}><span style={{position:'absolute', left:'50%', transform: 'translateX(-50%)'}}>{x}</span></div>)
      for (var i=0; i<(25/this.state.pattern.stitchWidth)-1; i++){
        if (x<this.state.pattern.width) {
          x++;
          rulerInnerTop.push(<div key={"top"+x} style={{width:this.state.pattern.stitchWidth, float:'left'}}>{ }</div>)
        }
      }
    }
    console.log("reversed",this.state.reverseRuler)
    if(this.state.reverseRuler){
      rulerInnerTop.reverse()
    }
    

    contents.unshift(<div className="ruler" key="rulerLeft" onMouseDown={(e) => this.clickRulerLeft(e)} onMouseUp={(e) => this.upRulerLeft(e)} onDoubleClick={() => this.setState({leftRulerMargin: 0})}
                      style={{height:this.state.pattern.stitchHeight*this.state.pattern.height, marginTop:25+"px", marginLeft:Math.max(0, this.state.leftRulerMargin)+scrollLeft+"px"}}>{rulerInnerLeft}</div>)
    contents.unshift(<div className="ruler" key="rulerTop" onMouseDown={(e) => this.clickRulerTop(e)} onMouseUp={(e) => this.upRulerTop(e)} onDoubleClick={() => this.setState({topRulerMargin: 0})}
                          style={{width:this.state.pattern.stitchWidth*this.state.pattern.width, marginLeft:25+"px", marginTop:Math.max(0,this.state.topRulerMargin)+scrollTop+"px"}}>{rulerInnerTop}</div>)
    
    contents.unshift(<div key="leftRulerBack" style={{backgroundColor:"grey", height:this.state.pattern.stitchHeight*this.state.pattern.height, marginLeft:scrollLeft, marginTop:25+"px", width:"25px", position:"absolute", zIndex: 1}}></div>)
    contents.unshift(<div key="topRulerBack" style={{backgroundColor:"grey", height:"25px", marginLeft:25+"px", width:this.state.pattern.stitchWidth*this.state.pattern.width, marginTop:scrollTop, position:"absolute", zIndex: 1}}></div>)
    
    return contents;
  }
  
    // TODO 
    // row tracker - should count the number of consecutive stitches - not too bad
    // 

    
  
  
    
    cellRenderer({columnIndex, key, rowIndex, style}) {
      var shape = this.state.shape
      if (this.state.stitchify){
        shape = "knit"
      }
      var className="stitch-shape-"+shape+"-inner"
      if (this.state.selectedBox === key) {
        className += "-selected"
      }
  
      return (
        <div className="untouchable" key={key} style={style}  draggable={false}>
          
          <div className={"stitch-shape-"+shape} style={{backgroundColor: (this.state.selectedBox === key) ? "gray": "darkgray"}}
            onMouseDown = {(event) => this.boxOnMouseDown(event,columnIndex, rowIndex, key)}
            onMouseOver = {(event) => this.boxOnMouseOver(event,columnIndex, rowIndex, key)}
            onMouseUp = {(event) => this.boxOnMouseUp(event,columnIndex, rowIndex, key)}
            onDragStart= {(event) => event.preventDefault}
            onDragEnd = {(event) => event.preventDefault}
            onDragOver = {(event) => event.preventDefault}
          >
            <div className={className} style={{backgroundColor: this.state.pattern.colorGrid[rowIndex][columnIndex]}}>
  
            </div>
          </div>
        </div>
      );
    }
  
    
    
    render() {
      // console.log("render start",Date.now())
      // onKeyPress={(event) => this.handleKeyPress(event)}
      // todo - samples? - drag and drop preset pattinos - make custom pattinos
      var colorBoxes = [];
      for (const [index, color] of this.state.colors.entries()) {
          colorBoxes.push(renderColorBox(index, color, this.state.selectedColor===color, (color) => this.clickColor(color)));
      }
      var colorValue = this.state.selectedColor === null ? "#ffffff" : this.state.selectedColor
      console.log('is row tracking', this.state.isRowTracking)
      return (
        
        <div className="main-window" onMouseUp = {(event) => this.universalMouseUp(event)} onMouseMove = {(event) => this.universalMouseMove(event)} >
          
          <div className="control-panel">
            <span>Width:</span>
            <input type="number" className="num-input" value={this.state.width} onChange={this.changeWidth}/>
            <span>Height:</span>
            <input type="number" className="num-input" value={this.state.height} onChange={this.changeHeight}/>
            <span>Stitch Width:</span>
            <input type="number" className="num-input" value={this.state.stitchWidth} onChange={this.changeStitchWidth}/>
            <span>Stitch Height:</span>
            <input type="number" className="num-input" value={this.state.stitchHeight} onChange={this.changeStitchHeight}/>
            
            <br></br>
            {this.classyButton(this.clickSelect, "sElect", actions.SELECTION)}
            {this.classyButton(this.clickCopy,"copy")}
            {this.classyButton(this.clickPaste,"paste")}
            {this.classyButton(this.clickPencil, "Pencil", actions.PENCIL)}
            {this.classyButton(this.clickBucket, "Bucket", actions.BUCKET)}
            {this.classyButton(this.clickSquare, "sQuare", actions.SQUARE)}
            {this.classyButton(this.clickStitchify, "stitchify")}
            {this.classyButton(this.clickSave, "save")}
            {this.classyButton(() => {this.setState({isRowTracking: !this.state.isRowTracking, rowTracker:this.state.pattern.height-1})}, "rowTracker")}
          </div>
          <div className = "workspace">
              <div className="tool-box">
                  <p>Choose a color:</p>
                  <input type="color" value={colorValue} onChange={this.changeColor}/>
                  <div className="classy-button" onClick={this.addColor}>
                      Select
                  </div>
                  <br></br>
                  {colorBoxes}
                  <br></br>
                  <br></br>
                  {this.state.isRowTracking && <div>
                    <br></br>
                    <p>Row Tracker:{this.state.rowTracker+1}</p>
                    <span className='classy-button' onClick={() => {this.setState({rowTracker: Math.max(0, this.state.rowTracker-1)})}}>Up</span>
                    <span className='classy-button' onClick={() => {this.setState({rowTracker: Math.min(this.state.pattern.height, this.state.rowTracker+1)})}}>Down</span>
                  </div>}
              </div>
              <div className="pattern-box">
                {/* this.setState({reverseRuler: !this.state.reverseRuler}) */}
              <span className='classy-button' onClick={() => {this.setState({reverseRuler: !this.state.reverseRuler})}} style={{position:"absolute", zIndex:5, top:Math.max(0,this.state.topRulerMargin)-20, left:'6px', borderRadius:'5px', padding:'2px'}}>{'R'}</span>
              <AutoSizer>
                {({ width, height }) => (
                  <Grid
                    cellRangeRenderer={this.cellRangeRenderer}
                    cellRenderer={this.cellRenderer}
                    columnCount={this.state.pattern.width}
                    columnWidth={this.state.pattern.stitchWidth}
                    height={height}
                    rowCount={this.state.pattern.height}
                    rowHeight={this.state.pattern.stitchHeight}
                    width={width}
  
                    pattern={this.state.pattern}
                    action={this.state.action}
                    selectedBox = {this.state.selectedBox}
                    corner2 = {this.state.corner2}
                    shape = {this.state.shape}
                    snapIndex = {this.state.snapshotIndex}
                    topRulerMargin = {this.state.topRulerMargin}
                    leftRulerMargin = {this.state.leftRulerMargin}
                    reverseRuler = {this.state.reverseRuler}
                    rowTracker = {this.state.rowTracker}
                  />
                )}
                </AutoSizer>
              </div>
          </div>
          {this.state.alert && <div className="alert alert-info" onClick={() => this.setState({alert: null})}> 
              {this.state.alert}
          </div>}
      </div>
      
  
      );
      // console.log("render stop",Date.now())
    }
  }