MazeRunner = function(params){
  for(var k in params) {
    this[k] = params[k];
  }
  
  if (this.imageURL) {
    this.loadBoundsFromImage();
  } else {
    this.init();
  }
};

MazeRunner.FLAGS = {
  VISITED : 1<<0,
  N       : 1<<1, // no N wall
  E       : 1<<2,
  S       : 1<<3,
  W       : 1<<4
};

MazeRunner.prototype = {
  // Dimensions of maze in cells
  w : 60,
  h : 60,
  runner : [0,0],
  
  // Drawing settings
  cursorOffset : [1.5, 1.5],
  cursor : [0,0],
  cellColor : '#fff',
  
  wallWidth : 1,
  cellWidth : 1
};

MazeRunner.prototype.createCanvas = function(){
  this._canvas = document.createElement('canvas');
  this._canvas.width = this.w*(this.cellWidth + this.wallWidth) + this.wallWidth;
  this._canvas.height = this.h*(this.cellWidth + this.wallWidth) + this.wallWidth;
  document.body.appendChild(this._canvas);
  
  this._ctx = this._canvas.getContext('2d');
  
  this._ctx.lineWidth = this.cellWidth;
  this._ctx.strokeStyle = this.cellColor;
};

MazeRunner.prototype.init = function(){
  // Fast 0 array creation, no nesting.
  // http://jsperf.com/typed-arrays-vs-arrays/7
  this._cells = new Uint32Array(this.w * this.h);
  
  // Create the runner's stack to keep track of his options
  this._stack = [this.runner.slice()];
  
  this.createCanvas();
};

MazeRunner.prototype.getCell = function(x, y){
  return this._cells[this.w * y + x];
};

MazeRunner.prototype.setCellFlag = function(x, y, value){
  this._cells[this.w * y + x] |= value;
  return value;
};

MazeRunner.prototype.getValidMoves = function(x, y){
  var potentialMoves = [
    // x, y, from, to
    [x-1, y,    'W',  'E'],
    [x+1, y,    'E',  'W'],
    [x,   y-1,  'N',  'S'],
    [x,   y+1,  'S',  'N']
  ];
  
  var validMoves = [];
  var self = this;
  potentialMoves.forEach(function(v){
    // Only add non-visited, in-bounds cells 
    if(
       !(self.getCell(v[0], v[1]) & MazeRunner.FLAGS.VISITED) &&
       v[0] >= 0 && v[0] < self.w &&
       v[1] >= 0 && v[1] < self.h
    ) {
      validMoves.push(v);
    }
  });
  
  return validMoves;
};

MazeRunner.prototype.step = function(){
  var fromX = this.runner[0];
  var fromY = this.runner[1];
  
  // Check for valid moves
  var validMoves = this.getValidMoves(fromX, fromY);
  if (validMoves.length) {
    var cell = this.getCell.apply(this, this.runner);
    
    var nextMove = validMoves[(Math.random() * validMoves.length)>>0];
    var toX = nextMove[0];
    var toY = nextMove[1];
    var nextCell = this.getCell(toX, toY);
    
    // Marked both cells as visited so we never cross back into 
    this.setCellFlag(fromX, fromY,  MazeRunner.FLAGS.VISITED + MazeRunner.FLAGS[nextMove[2]]);
    this.setCellFlag(toX,   toY,    MazeRunner.FLAGS.VISITED + MazeRunner.FLAGS[nextMove[3]]);
    
    var drawWidth = this.cellWidth + this.wallWidth;
    
    var drawFromX = fromX * drawWidth + this.cursorOffset[0];
    var drawFromY = fromY * drawWidth + this.cursorOffset[1];
    
    var drawToX = toX * drawWidth + this.cursorOffset[0];
    var drawToY = toY * drawWidth + this.cursorOffset[1];
    
    // Draw the tunnel from cell to cell.
    this._ctx.beginPath();
    this._ctx.moveTo(drawFromX, drawFromY);
    this._ctx.lineTo(drawToX,   drawToY);
    this._ctx.stroke();
    
    // Push our last position on the stack so we keep track of where we were
    // and use that in case we run out of places to go next step
    this._stack.push([toX, toY]);
    this.runner = [toX, toY];
  
  } else {
    // LIFO backtrack and find a cell which has valid moves.
    this.runner = this._stack.pop();
  }
  
  // Do we have any cells left to check?
  return this.runner != null;
};

MazeRunner.prototype.start = function(){
  var self = this;
  this._interval = setInterval(function(){
    if(!self.step()){
      clearInterval(self._interval);
      if(self.cb){
        self.cb();
      }
    }
  })
};

// Load a black on white connected image to set the bounds for the maze runner
MazeRunner.prototype.loadBoundsFromImage = function(){
  var cvs = document.createElement('canvas');
  var ctx = cvs.getContext('2d');
  
  var self = this;
  var img = new Image();
  
  img.onload = function(){
    // Paint to canvas then sample the image on the canvas.
    ctx.drawImage(img, 0, 0);
    var data = ctx.getImageData(0, 0, img.width, img.height).data;
    self.w = img.width;
    self.h = img.height;
    
    self.init();
    
    for(var i = self._cells.length; i-->0;) {
      if (data[i<<2]) { // white = visited. black = unvisited
        self._cells[i] = MazeRunner.FLAGS.VISITED;
      }
    }
    
    img = null;
    self.start();
  };
  
  // Load the image.
  img.src = this.imageURL;
};
