




// Default variables

var state = 0;
// 0 = No actions
// 1 = Editing node text
// 2 = Dragging node
// 3 = Drawing connection
// 4 = Deleting connections
// 5 = Selecting nodes

var onEmpty = 1;
// 0 = Mouse is hovering on empty canvas
// 1 = Mouse is hovering over element

var mX = 0; // Mouse x position
var mY = 0; // Mouse y position

var clickedX = 0; // X position of last click
var clickedY = 0; // Y position of last click

var mouseMoved = 0; // State of mouse movement between click and release
var activeKey = 0; // Currently held key (switch to array for key combinations)

var nodes = []; // [x, y, w, h, attached connections, text, deleted/active (0, 1), fixed/free node (0, 1), parent node(fixed only)]
var connections = []; // [x, y, x2, y2, child p5 sketch, cut, deleted/active (0, 1), line type]

var nodeCount = 0; // Total number of nodes in the map (including deleted ones)
var connectionCount = 0; // Total number of connections on the map (including deleted ones)

var clicked; // Last clicked node element
var connecting; // Currently drawn connection
var sketchId; // Id of currently drawn/edited p5 sketch

var selectedNodes = []; // It's in the name
var selectedConnections = []; // It's in the name

var xOffset = 0; // X offset used to calculate the top left position of a node based on it's centre
var yOffset = 0; // Y offset used to calculate the top left position of a node based on it's centre

var nHW = 20; // Default node half width
var nHH = 30; // Default node half height



// Load Map from Cookies

setTimeout(function() {

  let canRead = 0;
  canRead = Cookies.get('canRead');

  if (canRead) {

    let nodesCopy = JSON.parse(Cookies.get('nodes'));
    let connectionsCopy = JSON.parse(Cookies.get('connections'));

    let nodeCountCopy = Cookies.get('nodeCount');
    let connectionCountCopy = Cookies.get('connectionCount');


    // Load nodes

    for (let i = 0; i < nodeCountCopy; i++) {

      let n = nodesCopy[i];

      if (n[6]) {  // If element is active

        if (n[7]) {  // If free node

          // Recreate free node

          let x = (n[0] - Math.floor(n[2] / 2)) + nHW;
          let y = (n[1] - Math.floor(n[3] / 2)) + nHH;

          createNode(i, x, y, n[5]);

        } else {  // If fixed node

          // Recreate fixed node

          createFixedNode(i, n[8], n[5], 0);
        }
      }
    }


    // Load connections

    for (let i = 0; i < connectionCountCopy; i++) {

      let c = connectionsCopy[i];

      if (c[4]) {  // If connection is active

        createConnection(i, c[0], c[1], c[2], c[3], c[5]);
        connections[i] = [c[0], c[1], c[2], c[3], sketchId, 0, 1, c[5]];

      } else {  // If connection has been deleted

        connections[i] = [0, 0, 0, 0, 0, 0, 0];
      }
    }

    nodes = nodesCopy;
    nodeCount = nodeCountCopy;
    connectionCount = connectionCountCopy;
  }
}, 100);



// Save map to Cookies

setInterval(function() {

  let connectionsCopy = [];

  for (let i = 0; i < connectionCount; i++) {

    // Save x, y, x2, y2, deleted/active, line type off connections array into a copy

    connectionsCopy[i] = [connections[i][0], connections[i][1], connections[i][2], connections[i][3], connections[i][6], connections[i][7]];
  }

  Cookies.set('canRead', 1, { expires: 365 });
  Cookies.set('nodes', JSON.stringify(nodes), { expires: 365 });
  Cookies.set('connections', JSON.stringify(connectionsCopy), { expires: 365 });
  Cookies.set('nodeCount', nodeCount, { expires: 365 });
  Cookies.set('connectionCount', connectionCount, { expires: 365 });

  console.log('Saved');
}, 5000);



// Add default interactions to body

document.addEventListener('keydown', getKey);
document.addEventListener('keyup', function() { activeKey = 0; });

d3.select('body')
  .on('mousedown', bodyMouseDown)
  .on('mouseup', bodyMouseup)
  .on('mousemove', bodyMouseMove)
  .on('dblclick', bodyDBClick)
  .on('contextmenu', bodyRClick);

d3.select('a.button')
  .on('mousedown', function() { onEmpty = 0; })
  .on('click', deleteSelection);





// Input Functions

function bodyMouseDown() {

  // Set mouse movement tracking variable to default

  mouseMoved = 0;


  if (state < 2) {

    // Un-focus all nodes *****
    // Update last clicked position
    // Clear selection arrays
    // Delete latest node if empty
    // Reset state
    // If right clicked, set state to 4 (connection cutting tool)

    clickedX = mX;
    clickedY = mY;


    removEmptyNode();


    if (onEmpty) {

      // Cancel all active selections

      deselectAll();


      state = 0;

      if (getM() == 2) {

        // Create connection box
        // Set state to 4 (cutting connections)

        createConnection('cuttingTool', mX, mY, mX, mY, 1);
        state = 4;

      } else if (getM() == 3) {

        // Create connection box
        // Set state to 5 (selecting nodes)

        createConnection('multiSelect', mX, mY, mX, mY, 0);
        connecting.style('background-color', 'rgba(255, 255, 255, 0.03)');
        state = 5;
      }
    }
  }
}



function bodyMouseup() {

  switch(state) {

    case 2:

      // Release dragged nodes

      let x = getElementCenterX(clicked);
      let y = getElementCenterY(clicked);

      let nodeConnections = nodes[getIndexFromID(clicked.attr('id'))][4];

      for (i = 0; i < nodeConnections.length; i++) {

        let c = connections[getIndexFromID(nodeConnections[i])];
        if (c[6]) {

          if (c[7] == 0) {

            let num = ((Math.abs(c[2] - clickedX) < 2) && (Math.abs(c[3] - clickedY) < 2)) * 2;

            if ((c[2] != x) && (c[3] != y)) {
              c[num] = x;
              c[num + 1] = y;
            }
          }
        }
      }

      nodes[getIndexFromID(clicked.attr('id'))][0] = x;
      nodes[getIndexFromID(clicked.attr('id'))][1] = y;
      selectedConnections.length = 0;
      state = 1;

      break;



    case 3:

      // Delete in-progress connections

      if (onEmpty) {

        // If drawing a connection create a new node at cursor position
        // Snap connection to newly created node
        // Save connection info to the connections array
        // Add connection id to parents' info arrays
        // Increment total number of connections by one

        let x = getElementCenterX(clicked);
        let y = getElementCenterY(clicked);
        let clickedId = clicked.attr('id');

        createNode(-1, mX, mY, -1);

        let x2 = getElementCenterX(clicked);
        let y2 = getElementCenterY(clicked);
        let thisId = connecting.attr('id');
        let releasedOnId = clicked.attr('id');

        resizeElement(connecting, x, y, x2, y2);
        drawLine(sketchId, x, y, x2, y2, 0, 0);
        connections.push([x, y, x2, y2, sketchId, 0, 1, 0]);
        nodes[getIndexFromID(clickedId)][4].push(thisId);
        nodes[getIndexFromID(releasedOnId)][4].push(thisId);
        connectionCount++;
      }

      break;



    case 4:

      // Delete "cut" connections
      // Delete cutting tool sketch
      // Reset state to default

      for (let i = 0; i < connections.length; i++) {

        let a = connections[i];

        a[5] = Math.floor(intersects(a[0], a[1], a[2], a[3], clickedX, clickedY, mX, mY));
        if (a[5]) {
          a[6] = 0;
          d3.select('#connection-' + i).remove();
        }
      }
      connecting.remove();
      state = 0;

      break;



    case 5:

      // Add nodes in selection box to selectedNodes
      // Add attached connections to selectedConnections
      // Close selection tool

      for (let i = 0; i < nodes.length; i++) {

        let a = nodes[i];

        if (a[6]) {

          if (isInBox(a[0], a[1], clickedX, clickedY, mX, mY)) {

            aa = a[4];

            for (let y = 0; y < aa.length; y++) {

              if (connections[getIndexFromID(aa[y])]) { // WTF does this do???
                selectedConnections.push(d3.select('#' + aa[y]));
              }
            }

            selectedNodes.push(d3.select('#node-' + i));
          }
        }
      }

      if (selectedNodes.length > 0) {
        d3.select('a.button').style('opacity', '100%');
      }

      connecting.remove();
      state = 0;

      break;
  }
}



function bodyMouseMove() {

  // Reset onEmpty to default (will be turned false on element hover)

  onEmpty = 1;


  // Set mouse movement tracking variable to true (moved)

  mouseMoved = 1;


  // Update mouse x, y positions

  mX = event.clientX;
  mY = event.clientY;


  // Prevent text selection when not editing nodes

  if (state != 1) { event.preventDefault(); }


  if (state == 2) {

    // Update dragged node position
    // Update attached connections' size/position

    clicked.style('margin-left', (mX + xOffset) + 'px')
      .style('margin-top', (mY + yOffset) + 'px')
      .style('margin-bottom', (mY + yOffset) + 'px');

    let x = getElementCenterX(clicked);
    let y = getElementCenterY(clicked);

    let hasFixedTree = 0;

    if (selectedConnections.length > 0) {
      for (let i = 0; i < selectedConnections.length; i++) {

        let obj = selectedConnections[i];

        if (obj[4] == 0) {

          console.log('efewfe');

          let x2 = obj[1];
          let y2 = obj[2];

          resizeElement(obj[0], x, y, x2, y2);
          drawLine(obj[3], x, y, x2, y2, 0, 0);

        } else {

          hasFixedTree = 1;
        }
      }
    }

    if (hasFixedTree) { updateFixedTree(clicked); }
  }


  if (state == 3) {

    // Update drawn connection position/size

    let dir = (((clickedX < mX) && (clickedY < mY)) || ((clickedX > mX) && (clickedY > mY)));

    resizeElement(connecting, clickedX, clickedY, mX, mY);
    drawLine(sketchId, clickedX, clickedY, mX, mY, 0, 0);
  }


  if (state == 4) {

    // Draw cutting line
    // Check for connections line cuts
    // Highlight connections selected for cutting

    resizeElement(connecting, clickedX, clickedY, mX, mY);
    drawLine(sketchId, clickedX, clickedY, mX, mY, 1, 0);

    for (let i = 0; i < connections.length; i++) {

      let a = connections[i];

      if (a[6]) {

        a[5] = Math.floor(intersects(a[0], a[1], a[2], a[3], clickedX, clickedY, mX, mY));
        drawLine(a[4], a[0], a[1], a[2], a[3], a[7], a[5]);
      }
    }
  }


  if (state == 5) {

    // Draw selection box
    // Check for overlap with nodes
    // Highlight selected nodes

    resizeElement(connecting, clickedX, clickedY, mX, mY);

    for (let i = 0; i < nodes.length; i++) {

      let a = nodes[i];
      let c = '';

      if (a[6]) {

        if (isInBox(a[0], a[1], clickedX, clickedY, mX, mY)) {

          c = '404249';

        } else { c = '2A2C34'; }

        d3.select('#node-' + i).select('p').style('background-color', '#' + c);
      }
    }
  }
}



function bodyDBClick() {

  // Prevent contextmenu from showing

  event.preventDefault();


  if (onEmpty) {

    if (!mouseMoved) {

      if (state == 0) {

        // Create new node at mouse position

        createNode(-1, clickedX, clickedY, -1);
      }
    }
  }
}



function bodyRClick() {

  // Prevent contextmenu from showing

  event.preventDefault();
}



function nodeHover() {

  // If it's a free node
  // Set onEmpty to false to disable stacking new nodes
  // Display node handle

  onEmpty = 0;
  let obj = d3.select(this);

  if ((d3.select(this.parentNode)).attr('class') == "node_wrapper_column") {

    obj.select('div.text_bubble_handle')
       .style('opacity', '100%');
  }

 obj.select('div.new_node_button')
    .style('opacity', '100%');

  if (state == 3) {

    // Scale up selected node

    obj.style('transform', 'scale(1.02)');
  }
}



function nodeHoverOut() {

  // Hide node handle

  d3.select(this)
     .select('div.text_bubble_handle')
     .style('opacity', '0%');

 d3.select(this)
    .select('div.new_node_button')
    .style('opacity', '0%');

  if (state == 3) {

   // Reset scale

   d3.select(this)
     .style('transform', 'scale(1)');
  }
}



function nodeHandleMouseDown() {

  event.preventDefault();

  // Set onEmpty to false to disable stacking new nodes

  onEmpty = 0;


  // Set state to 2 (dragging node)
  // Save node parent to "clicked"
  // Save x, y offsets between mouse and element position
  // Add child connections to an array

  if (state < 2) {

    removEmptyNode();


    if (getM() == 0) {

      state = 2;
      clicked = d3.select(this.parentNode);
      clickedX = getElementCenterX(clicked);
      clickedY = getElementCenterY(clicked);

      xOffset = (parseInt(clicked.style('margin-left'), 10) - mX);
      yOffset = (parseInt(clicked.style('margin-top'), 10) - mY);

      let nodeConnections = nodes[getIndexFromID(clicked.attr('id'))][4];

      for (i = 0; i < nodeConnections.length; i++) {

        let c = connections[getIndexFromID(nodeConnections[i])];

        if (c[6]) {
          let num = ((c[0] == clickedX) && (c[1] == clickedY)) * 2;
          selectedConnections.push([d3.select('#' + nodeConnections[i]), c[0 + num], c[1 + num], c[4], c[7]]);
        }
      }
    }
  }
}



function nodeHandleMouseUp() {

  // If dragging a node, release it *****
}



function nodeChildMouseDown() {

  // Set onEmpty to false to disable stacking new nodes

  onEmpty = 0;


  // If possible...
  // Save node parent to "clicked"
  // If left clicked, set state to 1 (editing)
  // If right clicked, create connection and set state to 3 (drawing connection)

  if (state < 2) {

    // Define this element as 'next clicked'
    // Previous clicked variable still needed to check for empty nodes

    let clickedNext = d3.select(this.parentNode);


    // Update last clicked position

    clickedX = getElementCenterX(clickedNext);
    clickedY = getElementCenterY(clickedNext);


    // Delete new node if empty

    removEmptyNode();


    // Save object into "clicked"

    clicked = clickedNext;

    if (getM() == 0) {

      state = 1;

    } else if (getM() == 2) {

      // Prevent default context menu from showing
      // If node is not empty create new connection
      // Set state to 3 (drawing connection)

      event.preventDefault();

      if (clicked.text() != "") {

        createConnection(-1, clickedX, clickedY, mX, mY, 0);
        state = 3;
      }
    }
  }
}



function nodeChildMouseUp() {

  if (state == 3) {

    // If drawing connection, check if this was the starting point
    // If so delete connection...
    // If not snap connection to this node's center
    // Save connection info to the connections array
    // Add connection id to parents' info arrays
    // Increment total number of connections by one

    let releasedOn = d3.select(this.parentNode);

    if (releasedOn.attr('id') != clicked.attr('id')) {

      let x2 = getElementCenterX(releasedOn);
      let y2 = getElementCenterY(releasedOn);

      console.log([x2, y2]);

      let thisId = connecting.attr('id');
      let clickedId = clicked.attr('id');
      let releasedOnId = releasedOn.attr('id');

      resizeElement(connecting, clickedX, clickedY, x2, y2);
      drawLine(sketchId, clickedX, clickedY, x2, y2, 0, 0);
      connections.push([clickedX, clickedY, x2, y2, sketchId, 0, 1, 0]);
      nodes[getIndexFromID(clickedId)][4].push(thisId);
      nodes[getIndexFromID(releasedOnId)][4].push(thisId);
      connectionCount++;

    } else {

      connecting.remove();
    }


    releasedOn.style('transform', 'scale(1)');
    selectedConnections.length = 0;
    state = 0;
  }
}



function nodeInput() {

  // Save edited text into nodes array

  let id = clicked.attr('id');
  let node = nodes[getIndexFromID(id)];

  node[5] = d3.select('#' + id).text();


  // Update attached connections when typing

  let x = getElementCenterX(clicked); // New position
  let y = getElementCenterY(clicked);
  let x3 = node[0];  // Old position
  let y3 = node[1];
  let nodeConnections = node[4];

  for (i = 0; i < nodeConnections.length; i++) {

    let c = connections[getIndexFromID(nodeConnections[i])];

    if (c[6]) {

      let num = ((c[2] == x3) && (c[3] == y3)) * 2;

      let x2 = c[2 - num]; // Moved connection endpoint position
      let y2 = c[3 - num];
      let dir = (((x < x2) && (y < y2)) || ((x > x2) && (y > y2)));
      let obj = d3.select('#' + nodeConnections[i]);

      resizeElement(obj, x, y, x2, y2);
      drawLine(c[4], x, y, x2, y2, c[7], 0);

      c[0 + num] = x;
      c[1 + num] = y;
    }
  }

  node[0] = x;
  node[1] = y;
  node[2] = parseInt(clicked.style('width'));
  node[3] = parseInt(clicked.style('height'));

  if (node[7] == 0) { updateFixedTree(clicked); }
}



function getKey(event) {

  // Return key pressed

  if (event.isComposing || event.keyCode === 229) { return; }

  if (event.keyCode === 17) { activeKey = 17; }
  if (event.keyCode === 18) { activeKey = 18; }

  if (event.keyCode === 46) { deleteSelection(); }
}








// Other Functions

function getM() {

  // Return mouse input (with key combinations)

  let m;
  if (event.button == 0) {
    m = 0;
    if (activeKey == 17) {
      m = 2;
    } else if (activeKey == 18) {
      m = 3;
    }
  } else if (event.button == 2) {
    m = 2;
  }
  return m;
}



function createNode(id, x, y, txt) {

  // Check if old or new id should be used and define it
  // If new, increment total number of nodes by one
  // Create id string
  // Push new node object to the "nodes array"

  state = 1;

  let id2 = nodeCount;
  if (id != -1) { id2 = id; } else { nodeCount++; }
  let id3 = 'node-' + id2;

  let txt2 = "";
  if (txt != -1) { txt2 = txt; }

  nodes[id2] = [x, y, 36, 68, [], txt2, 1, 1, -1];


  // Create new node with given parameters
  // Save the node's text containing child in "clicked"

  d3.select('body')
    .append('div')
    .classed('node_wrapper free_node', true)
    .call(function(parent) {

      parent.append('div')
        .classed('node_wrapper_column', true)
        .append('div')
        .classed('text_bubble_wrap', true)
        .attr('id', id3)
        .style('margin-left', (x - nHW) + 'px')
        .style('margin-top', (y - nHH) + 'px')
        .style('margin-bottom', (y - nHH) + 'px')
        .style('z-index', '10')
        .on('mouseenter', nodeHover)
        .on('mouseleave', nodeHoverOut)
        .call(function(parent) {

          clicked = parent;

          parent.append('div')
            .classed('text_bubble_handle', true)
            .on('mousedown', nodeHandleMouseDown)
            .on('mouseup', nodeHandleMouseUp)
            .append('div')
            .classed('handle_line_and_circle', true)
            .call(function(parent) {

              parent.append('div')
                .classed('handle_circle', true);

              parent.append('div')
                .classed('handle_line', true);
            });

          parent.append('div')
            .style('display', 'inline-block')
            .on('mousedown', nodeChildMouseDown)
            .on('mouseup', nodeChildMouseUp)
            .append('p')
            .text(txt2)
            .classed('text_bubble', true)
            .attr('contenteditable', 'true')
            .on('input', nodeInput)
            .call(function(parent) { if (txt == -1) { parent.node().focus();}});


          parent.append('div')
            .classed('new_node_button', true)
            .on('click', function() { createFixedNode(-1, id3, -1, 1); })
            .append('div')
            .classed('handle_line_and_circle new_node', true)
            .call(function(parent) {

              parent.append('div')
                .classed('handle_line', true);

              parent.append('div')
                .classed('handle_circle new_node_circle', true)
                .append('image')
                .classed('add_icon', true)
                .attr('src', 'images/add_icon.svg');
            });
          });

        parent.append('div')
          .classed('node_wrapper_column column_two', true)
      })
}



function createFixedNode(id, parent, txt, newNode) {

  state = 1;

  //let id = nodeCount;
  //let id2 = 'node-' + id;

  let id2 = nodeCount;
  if (id != -1) { id2 = id; } else { nodeCount++; }
  let id3 = 'node-' + id2;

  let txt2 = "";
  if (txt != -1) { txt2 = txt; }

  let th = d3.select('#' + parent);
  let obj = d3.select(th.node().parentNode.parentNode);

  nodes[id2] = [0, 0, 36, 68, [], "", 1, 0, parent];

  obj.select('div.node_wrapper_column.column_two')
    .append('div')
    .classed('node_wrapper', true)
    .call(function(parent) {

      parent.append('div')
        .classed('node_wrapper_column', true)
        .append('div')
        .classed('text_bubble_wrap', true)
        .attr('id', id3)
        .style('z-index', '10')
        .on('mouseenter', nodeHover)
        .on('mouseleave', nodeHoverOut)
        .call(function(parent) {

          clicked = parent;

          parent.append('div')
            .style('display', 'inline-block')
            .on('mousedown', nodeChildMouseDown)
            .on('mouseup', nodeChildMouseUp)
            .append('p')
            .text(txt2)
            .classed('text_bubble fixed_bubble', true)
            .attr('contenteditable', 'true')
            .on('input', nodeInput)
            .call(function(parent) { if (txt == -1) { parent.node().focus();}});


          parent.append('div')
            .classed('new_node_button', true)
            .on('click', function() { createFixedNode(-1, id3, -1, 1); })
            .append('div')
            .classed('handle_line_and_circle new_node', true)
            .call(function(parent) {

              parent.append('div')
                .classed('handle_line', true);

              parent.append('div')
                .classed('handle_circle new_node_circle', true)
                .append('image')
                .classed('add_icon', true)
                .attr('src', 'images/add_icon.svg');
            });
          });

        parent.append('div')
          .classed('node_wrapper_column column_two', true)
      })


  // If creating new node (not from save file)...
  // Get and save new node center position
  // Create new connection

  if (newNode) {

    let x = getElementCenterX(clicked);
    let y = getElementCenterY(clicked);

    nodes[id2][0] = x;
    nodes[id2][1] = y;

    if (id == -1) {

      let x2 = getElementCenterX(th);
      let y2 = getElementCenterY(th);

      createConnection(-1, x, y, x2, y2, 2);
      connections.push([x, y, x2, y2, sketchId, 0, 1, 2]);
      nodes[getIndexFromID(parent)][4].push('connection-' + connectionCount);
      nodes[id2][4].push('connection-' + connectionCount);
      connectionCount++;

      // Update fixed node tree positions

      updateFixedTree(clicked);
    }
  }

}



function createConnection(id, x, y, x2, y2, lineType) {

  // Check if old or new id should be used and define it
  // Create id string
  // Create connection box

  let id2 = connectionCount;
  if (id != -1) { id2 = id; }
  let id3 = 'connection-' + id2;

  d3.select('body')
    .append('div')
    .attr('id', id3)
    .style('position', 'absolute')
    .style('z-index', '0')
    .call(function(parent) {
      connecting = parent;
    });

  createP5Canvas(id3);

  connecting.select('canvas')
    .style('width', '100%')
    .style('height', '100%');

  // Set connection position/size
  // Draw connection line

  let lT = 0;
  if (lineType == 2) { lT = 2; }

  resizeElement(connecting, x, y, x2, y2);
  drawLine(sketchId, x, y, x2, y2, lT, 0);
}



function createP5Canvas(pId) {

  // Create p5 sketch bound to given parent id

  new p5(sketch_connection, pId)

  function sketch_connection(p) {

    sketchId = p;
    sketchId.setup = function () {
      sketchId.createCanvas(0,0);
      sketchId.noFill();
      sketchId.strokeWeight(2);
    }
  }
}



function drawLine(sketchId, x, y, x2, y2, lineType, selected) {

  // Draw bezier line between connection points

  let w = Math.abs(x - x2);
  let h = Math.abs(y - y2);
  let dir = (((x < x2) && (y < y2)) || ((x > x2) && (y > y2)));

  sketchId.resizeCanvas(w, h);
  sketchId.clear();
  sketchId.stroke('#2A2C34');
  if (selected) { sketchId.stroke(255); }

  if (lineType == 0) { sketchId.bezier(w * (!dir), 0, w / 2, 0, w / 2, h, w * dir, h); }
  else if (lineType == 1) { sketchId.line(w * (!dir), 0, w * dir, h); }
  else if (lineType == 2) { sketchId.line(w * (!dir), 0, w * dir, h); }

}



function resizeElement(obj, x, y, x2, y2) {

  // Reposition and resize element

  obj.style('margin-left', Math.min(x, x2) + 'px')
  .style('margin-top', Math.min(y, y2) + 'px')
  .style('margin-bottom', Math.min(y, y2) + 'px')
  .style('width', Math.abs(x - x2) + 'px')
  .style('height', Math.abs(y - y2) + 'px');
}



function updateFixedTree(obj) {

  // Update all fixed children nodes and attached connections of obj

  let obj2 = d3.select('#node-' + getTreeParentIndex(obj));

  d3.select(obj2.node().parentNode.parentNode)
    .selectAll('div.text_bubble_wrap')
    .each(function() {

      console.log(this);

      let parent = d3.select(this);

      if (parent != null) {

        let a = nodes[getIndexFromID(parent.attr('id'))];
        let nodeConnections = a[4];
        console.log(nodeConnections);

        // Save previous node position before updating
        // Update node position and w/h

        let x = getElementCenterX(parent);
        let y = getElementCenterY(parent);
        console.log("New Pos: " + [x, y]);
        let pX = a[0];
        let pY = a[1];
        console.log("Prev Pos: " + [pX, pY]);

        a[0] = x;
        a[1] = y;
        a[2] = parseInt(obj.style('width'));
        a[3] = parseInt(obj.style('height'));

        // Cycle through attached connections

        for (let z = 0; z < nodeConnections.length; z++) {

          // Select connection endpoint to be moved
          // Update it and redraw connection

          let i = getIndexFromID(nodeConnections[z]);

          console.log(i);

          let c = connections[i];

          if (c[6]) {

            let num = ((Math.abs(c[2] - pX) < 2) && (Math.abs(c[3] - pY) < 2)) * 2;

            console.log("Num: " + num);

            console.log("Connection: " + [c[0], c[1], c[2], c[3]]);

            c[num] = x;
            c[num + 1] = y;

            console.log(c);

            let obj3 = d3.select('#' + nodeConnections[z]);
            resizeElement(obj3, c[0], c[1], c[2], c[3]);
            drawLine(c[4], c[0], c[1], c[2], c[3], c[7], 0);
          }
        }
      }
    });
}



function removEmptyNode() {

  // Delete new node if empty

  if (state == 1) {

    if (clicked.select('p').text() == "") {

      if ((Math.abs(getElementCenterX(clicked) - clickedX) > nHW) || (Math.abs(getElementCenterY(clicked) - clickedY) > nHH)) {

        // Delete latest node
        // Set node state to 0 (deleted)
        // Delete attached connections
        // Set connections states to 0 (deleted)

        let n = nodes[getIndexFromID(clicked.attr('id'))];
        selectedNodes.push(clicked);

        for (let i = 0; i < n[4].length; i++) {

          selectedConnections.push(d3.select('#' + n[4][i]));
        }

        deleteSelection();
      }
    }

  }
}



function deleteSelection() {

  // Delete selected nodes
  // Darken delete button (inactive)

  let selectedFixedNodes = [];

  for (let i = 0; i < selectedNodes.length; i++) {

    let n = nodes[getIndexFromID(selectedNodes[i].attr('id'))]
    n[6] = 0;
    selectedNodes[i].node().parentNode.parentNode.remove();


    // Filter and save selected fixed nodes for fixed tree updates

    if (!(n[7])) { selectedFixedNodes.push(selectedNodes[i]); }
  }

  // Delete selected connections

  for (let i = 0; i < selectedConnections.length; i++) {

    let sC = selectedConnections[i];

    // Check if connection hasn't already been deleted
    // (The same connection can be selected by two nodes)

    if (sC.node() != null) {

      connections[getIndexFromID(sC.attr('id'))][6] = 0;
      sC.remove();
    }
  }


  // Check for unique free parent nodes
  // Update afected fixed node tree positions

  let a = [];
  let id = 0;

  for (let i = 0; i < selectedFixedNodes.length; i++) {

    // Check for parent node
    // If there is one look for it's parent
    // Repeat until the free parent node is found

    let ind = getTreeParentIndex(selectedFixedNodes[i]);
    let canAdd = 1;

    for (let z = 0; z < a.length; z++) {

      if (a[z] == ind) { canAdd = 0; }
    }

    if (canAdd) {

      a.push(ind);
    }
  }

  for (let i = 0; i < a.length; i++) {

    let obj = d3.select('#node-' + a[i]);
    updateFixedTree(obj);
    console.log('Updated ' + a.length + ' Node Trees');
  }


  d3.select('a.button').style('opacity', '');
  selectedNodes.length = 0;
  selectedConnections.length = 0;
}



function deselectAll() {

  // Deselect selected nodes and connections
  // Darken delete button (inactive)

  for (let i = 0; i < selectedNodes.length; i++) {

    selectedNodes[i].select('p').style('background-color', '#2F3138');
  }

  selectedNodes.length = 0;
  selectedConnections.length = 0;
  d3.select('a.button').style('opacity', '50%');
}



function getElementCenterX(obj) {

  // Check if element is a fixed or free node
  // Calculate and return centered X position of element

  if ((nodes[getIndexFromID(obj.attr('id'))][7])) {

    return parseInt(obj.style('margin-left'), 10) + Math.floor(parseInt(obj.style('width'), 10) / 2);

  } else {

    let bounding = obj.node().getBoundingClientRect();
    return (Math.floor(bounding.left) + Math.floor(parseInt(obj.style('width'), 10) / 2));
  }
}



function getElementCenterY(obj) {

  // Check if element is a fixed or free node
  // Calculate and return centered Y position of element

  if ((nodes[getIndexFromID(obj.attr('id'))][7])) {

    return parseInt(obj.style('margin-top'), 10) + Math.floor(parseInt(obj.style('height'), 10) / 2);

  } else {

    let bounding = obj.node().getBoundingClientRect();
    return (Math.floor(bounding.top) + Math.floor(parseInt(obj.style('height'), 10) / 2));
  }
}



function getIndexFromID(id) {

  // Extract array index from element id

  return id.split('-')[1];
}



function getTreeParentIndex(obj) {

  let n = 1;
  let i = getIndexFromID(obj.attr('id'));

  while (n) {

    if (nodes[i][8] != -1) {

      i = getIndexFromID(nodes[i][8]);

    } else { n = 0; }
  }

  return i;
}



function intersects(a,b,c,d,p,q,r,s) {

  // returns true iff the line from (a,b)->(c,d) intersects with (p,q)->(r,s)

  var det, gamma, lambda;
  det = (c - a) * (s - q) - (r - p) * (d - b);
  if (det === 0) {
    return false;
  } else {
    lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
    gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  }
}



function isInBox(x, y, x2, y2, x3, y3) {

  if ((x > (Math.min(x2, x3))) && (x < (Math.max(x2, x3)))) {

    if ((y > (Math.min(y2, y3))) && (y < (Math.max(y2, y3)))) {

      return true;

    } else { return false; }

  } else { return false; }
}
