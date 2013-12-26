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
  w : 60,
  h : 60,
  // total width of the DOM el for a cell = border-left + width + border-right
  // MUST coincide with the values in css/maze.css
  cellWidth : 6,
  runner : [0,0]
};

MazeRunner.prototype.init = function(){
  // Fast 0 array creation, no nesting.
  // http://jsperf.com/typed-arrays-vs-arrays/7
  this._cells = new Uint32Array(this.w * this.h);
  
  // Generate all the cells
  this._el = document.createElement('div');
  this._el.className = 'maze';
  this._el.style.width = this.w * this.cellWidth;
  
  for(var i = this._cells.length; i-->0;) {
    this._el.appendChild(document.createElement('div'));
  }
  
  if (this.container != null) {
    this.container.appendChild(this._el);
  } else {
    document.body.appendChild(this._el);
  }
  
  // Create the runner's stack to keep track of his options
  this._stack = [this.runner.slice()];
};

MazeRunner.prototype.getCell = function(x, y){
  var index = this.w * y + x;
  return {
    el    : this._el.children[index],
    value : this._cells[index]
  };
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
       !(self.getCell(v[0], v[1]).value & MazeRunner.FLAGS.VISITED) &&
       v[0] >= 0 && v[0] < self.w &&
       v[1] >= 0 && v[1] < self.h
    ) {
      validMoves.push(v);
    }
  });
  
  return validMoves;
};

MazeRunner.prototype.getCellClassName = function(x, y) {
  var value = this.getCell(x, y).value;
  var className = '';
  ['N', 'S', 'E', 'W'].forEach(function(v){
    if(value & MazeRunner.FLAGS[v]) className += v;
  });
  return className;
};

MazeRunner.prototype.step = function(){
  var x = this.runner[0];
  var y = this.runner[1];
  
  // Check for valid moves
  var validMoves = this.getValidMoves(x, y);
  if (validMoves.length) {
    var cell = this.getCell.apply(this, this.runner);
    
    var nextMove = validMoves[(Math.random() * validMoves.length)>>0];
    var nextCoords = nextMove.slice(0,2);
    var nextCell = this.getCell.apply(this, nextCoords);
    
    // Carve from the current cell.
    this.setCellFlag(x, y, MazeRunner.FLAGS.VISITED + MazeRunner.FLAGS[nextMove[2]]);
    cell.el.className = this.getCellClassName(x, y);
    
    // Carve into the next cell
    this.setCellFlag(nextMove[0], nextMove[1], MazeRunner.FLAGS.VISITED + MazeRunner.FLAGS[nextMove[3]]);
    nextCell.el.className = this.getCellClassName.apply(this, nextCoords);
    
    this._stack.push(nextCoords);
    this.runner = nextCoords.slice();
  
  // LIFO backtrack and find a cell which has valid moves.
  } else {
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

// Draw a black on white connected image to set the bounds for
// the generated maze!
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
