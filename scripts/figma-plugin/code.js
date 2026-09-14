figma.showUI(__html__, { width: 320, height: 200 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'import-layers') {
    const importData = msg.data;
    
    try {
      if (Array.isArray(importData)) {
        // Batch Mode: Loop through each page in the array
        figma.notify(`⏳ Importing ${importData.length} pages...`);
        const frames = [];
        
        for (let i = 0; i < importData.length; i++) {
          const item = importData[i];
          
          let parentFrame;
          if (item.isComponent) {
            parentFrame = figma.createComponent();
          } else {
            parentFrame = figma.createFrame();
          }
          
          parentFrame.name = item.name || `Page ${i + 1}`;
          
          // Use original component bounds if available, fallback to screen size
          const frameWidth = (item.data && item.data.width) || 1440;
          const frameHeight = (item.data && item.data.height) || 900;
          parentFrame.resize(frameWidth, frameHeight);
          
          // Parse flow and step numbers from the name (e.g. "Flow 2 - Step 3: ...")
          let flowNum = 1;
          let stepNum = i + 1;
          const nameMatch = (item.name || '').match(/Flow\s*(\d+)\s*-\s*Step\s*(\d+)/i);
          if (nameMatch) {
            flowNum = parseInt(nameMatch[1], 10);
            stepNum = parseInt(nameMatch[2], 10);
          }
          
          // Position them:
          // For components, they line up nicely in a single row
          // For flow steps, they line up in swimlanes
          parentFrame.x = (stepNum - 1) * 1800;
          parentFrame.y = (flowNum - 1) * 1200;
          
          figma.currentPage.appendChild(parentFrame);
          
          // Render the contents inside the frame
          await drawFigmaNode(item.data, parentFrame);
          frames.push(parentFrame);
        }

        // --- VISUAL DESIGN CONNECTORS FOR JOURNEYS ---
        // 1. Try dynamic connections from metadata in the JSON items
        let dynamicConnectionsDrawn = false;
        
        for (let i = 0; i < importData.length; i++) {
          const item = importData[i];
          if (item.connections && Array.isArray(item.connections)) {
            for (const conn of item.connections) {
              const fromFrame = frames[i];
              const toFrame = frames[conn.destinationIndex];
              if (fromFrame && toFrame) {
                const occurrence = conn.occurrence || 1;
                const triggerNode = findButtonNode(fromFrame, conn.triggerText, occurrence);
                if (triggerNode) {
                  await drawDesignConnector(triggerNode, toFrame, conn.triggerText);
                  dynamicConnectionsDrawn = true;
                  figma.notify(`✅ Connected "${conn.triggerText}" to Step ${conn.destinationIndex + 1}`);
                } else {
                  figma.notify(`⚠️ Could not find "${conn.triggerText}" on Step ${i + 1}`, { error: true });
                }
              }
            }
          }
        }
        
        // 2. Fallback: If no dynamic metadata was found and we imported exactly 4 frames
        if (!dynamicConnectionsDrawn && frames.length === 4) {
          figma.notify('🔗 Drawing default design connection arrows...');
          
          // Step 1 -> Step 2: Connect "+ New campaign" button on Step 1 to Step 2 Frame
          const btnStep1 = findButtonNode(frames[0], 'New campaign');
          if (btnStep1) {
            await drawDesignConnector(btnStep1, frames[1], 'Click "+ New campaign"');
          }
          
          // Step 2 -> Step 3: Connect "Cleansing Balm" input box on Step 2 to Step 3 Frame
          const inputStep2 = findButtonNode(frames[1], 'Cleansing Balm');
          if (inputStep2) {
            await drawDesignConnector(inputStep2, frames[2], 'Fill Campaign Info');
          }
          
          // Step 3 -> Step 4: Connect "Create campaign" button on Step 3 to Step 4 Frame
          const btnStep3 = findButtonNode(frames[2], 'Create campaign');
          if (btnStep3) {
            await drawDesignConnector(btnStep3, frames[3], 'Click "Create campaign"');
          }
        }
      } else {
        // Single Mode: Single page layout
        figma.notify('⏳ Importing single page...');
        const parentFrame = figma.createFrame();
        parentFrame.name = "Imported Webpage";
        parentFrame.resize(1440, 900);
        figma.currentPage.appendChild(parentFrame);
        
        await drawFigmaNode(importData, parentFrame);
      }
      
      figma.ui.postMessage({ type: 'success' });
      figma.notify('✅ Sync Complete!');
    } catch (error) {
      console.error(error);
      figma.notify('❌ Error: ' + error.message, { error: true });
    }
  }
};

// Helper to find all Text nodes matching a search string recursively (case-insensitive)
function findNodesByText(rootNode, text, list = []) {
  if (rootNode.type === 'TEXT' && rootNode.characters) {
    const characters = rootNode.characters.toLowerCase();
    const query = text.toLowerCase();
    if (characters.includes(query)) {
      list.push(rootNode);
    }
  }
  
  if ('children' in rootNode) {
    for (const child of rootNode.children) {
      findNodesByText(child, text, list);
    }
  }
  return list;
}

// Helper to find a button container or the text element itself for click actions.
// Walks up the DOM tree from the text node to locate component instances or container wrappers.
// Supports targetting duplicate texts via the optional 'occurrence' index (1-indexed).
function findButtonNode(rootNode, buttonText, occurrence = 1) {
  const textNodes = findNodesByText(rootNode, buttonText);
  if (textNodes.length === 0) return null;
  
  // Select the specific instance (bound within range)
  const targetIdx = Math.min(Math.max(0, occurrence - 1), textNodes.length - 1);
  const textNode = textNodes[targetIdx];
  
  let current = textNode;
  
  // Traverse up the parents to find the highest logical clickable component (e.g. Instance, Component, or Frame wrapper)
  while (current.parent && current.parent !== rootNode) {
    const parentType = current.parent.type;
    
    // 1. If parent is a Component Instance or main Component, it represents the full Button component
    if (parentType === 'INSTANCE' || parentType === 'COMPONENT') {
      return current.parent;
    }
    
    // 2. If it is a top-level Frame or Group wrapper directly inside the parent page Frame, it is the button container
    if (current.parent.parent === rootNode && (parentType === 'FRAME' || parentType === 'GROUP')) {
      return current.parent;
    }
    
    current = current.parent;
  }
  
  // Fallback to text node if no container is found
  return textNode;
}

// Helper to set interactive prototype navigation click events between nodes
async function setNavigationReaction(triggerNode, destinationNode) {
  if (!triggerNode || !destinationNode) return;
  
  try {
    const reaction = {
      trigger: { type: 'ON_CLICK' },
      actions: [
        {
          type: 'NODE',
          destinationId: destinationNode.id,
          navigation: 'NAVIGATE',
          transition: { type: 'DISSOLVE', duration: 250 }, // Smooth dissolve effect
          preserveScrollPosition: false
        }
      ]
    };
    // Use async API to write to reactions
    await triggerNode.setReactionsAsync([reaction]);
    console.log(`Connected: ${triggerNode.name} ➔ ${destinationNode.name}`);
  } catch (err) {
    console.error(`Failed to link prototype reaction: ${err.message}`);
  }
}

// Helper to get absolute coordinates of a node on the page
function getAbsolutePosition(node) {
  let x = node.x;
  let y = node.y;
  let current = node.parent;
  
  while (current && current.type !== 'PAGE' && current.type !== 'DOCUMENT') {
    if ('x' in current && 'y' in current) {
      x += current.x;
      y += current.y;
    }
    current = current.parent;
  }
  
  return {
    x: x,
    y: y,
    width: node.width || 0,
    height: node.height || 0
  };
}

// Helper to draw a native Figma Connector Line that dynamically binds the nodes together
async function drawDesignConnector(fromNode, toNode, labelText = "Click") {
  if (!fromNode || !toNode) return;
  
  try {
    const connector = figma.createConnector();
    connector.name = `Link: ${labelText}`;
    
    // Set stroke styles to Premium Indigo
    connector.strokes = [{ type: 'SOLID', color: { r: 0.33, g: 0.32, b: 1.0 } }];
    connector.strokeWeight = 3;
    
    // Bind to the elements (magnet AUTO will automatically find the best side of the frames to hook into)
    connector.connectorStart = {
      endpointNodeId: fromNode.id,
      magnet: 'AUTO'
    };
    connector.connectorEnd = {
      endpointNodeId: toNode.id,
      magnet: 'AUTO'
    };
    
    // Add text label on the connector
    if (labelText) {
      const textNode = figma.createText();
      await figma.loadFontAsync({ family: "Inter", style: "Medium" });
      textNode.fontName = { family: "Inter", style: "Medium" };
      textNode.characters = labelText.toUpperCase();
      textNode.fontSize = 10;
      textNode.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.18, b: 0.6 } }]; // Dark indigo text
      connector.appendChild(textNode);
    }
    
    console.log(`Native connector drawn successfully between ${fromNode.name} and ${toNode.name}`);
  } catch (err) {
    console.warn(`Failed to draw native connector: ${err.message}. Falling back to vector...`);
    await drawVectorConnector(fromNode, toNode, labelText);
  }
}

// Fallback: draw static vector paths representing connectors
async function drawVectorConnector(fromNode, toNode, labelText = "Click") {
  try {
    const fromBounds = getAbsolutePosition(fromNode);
    const toBounds = getAbsolutePosition(toNode);
    
    const startX = fromBounds.x + fromBounds.width;
    const startY = fromBounds.y + (fromBounds.height / 2);
    const endX = toBounds.x;
    const endY = toBounds.y + (toBounds.height / 2);
    const midX = startX + (endX - startX) * 0.45;
    
    const themeColor = { r: 0.33, g: 0.32, b: 1.0 };
    
    const line = figma.createVector();
    line.name = "Connector Line";
    line.vectorPaths = [{
      windingRule: "NONE",
      data: `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`
    }];
    line.strokes = [{ type: 'SOLID', color: themeColor }];
    line.strokeWeight = 3;
    line.strokeJoin = 'ROUND';
    
    const arrowhead = figma.createVector();
    arrowhead.name = "Arrowhead";
    arrowhead.vectorPaths = [{
      windingRule: "NONZERO",
      data: `M ${endX} ${endY} L ${endX - 12} ${endY - 7} L ${endX - 12} ${endY + 7} Z`
    }];
    arrowhead.fills = [{ type: 'SOLID', color: themeColor }];
    arrowhead.strokes = [];
    
    const labelGroup = figma.createFrame();
    labelGroup.name = "Label Badge";
    labelGroup.layoutMode = "HORIZONTAL";
    labelGroup.counterAxisSizingMode = "AUTO";
    labelGroup.primaryAxisSizingMode = "AUTO";
    labelGroup.paddingLeft = 8;
    labelGroup.paddingRight = 8;
    labelGroup.paddingTop = 4;
    labelGroup.paddingBottom = 4;
    labelGroup.cornerRadius = 6;
    labelGroup.fills = [{ type: 'SOLID', color: { r: 0.92, g: 0.93, b: 1.0 } }];
    labelGroup.strokes = [{ type: 'SOLID', color: { r: 0.8, g: 0.82, b: 1.0 } }];
    labelGroup.strokeWeight = 1;
    
    const textNode = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
    textNode.characters = labelText.toUpperCase();
    textNode.fontSize = 9;
    textNode.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.18, b: 0.6 } }];
    
    labelGroup.appendChild(textNode);
    labelGroup.x = startX + (midX - startX) / 2 - 30;
    labelGroup.y = startY - 10;
    
    const flowGroup = figma.group([line, arrowhead, labelGroup], figma.currentPage);
    flowGroup.name = `Flow: ${fromNode.name} ➔ ${toNode.name}`;
  } catch (err) {
    console.error(`Failed to draw design vector fallback connector: ${err.message}`);
    figma.notify(`❌ Error drawing connector line: ${err.message}`, { error: true });
  }
}

// Helper function to sanitize paint fills (e.g. converting network IMAGE fills to solid placeholders)
function sanitizeFills(fills) {
  if (!fills || !Array.isArray(fills)) return [];
  
  return fills.map(fill => {
    // If it's an image paint, Figma API requires an uploaded imageHash.
    // Since we don't have the hash, we convert it to a light gray solid placeholder to avoid crashes.
    if (fill.type === 'IMAGE') {
      return {
        type: 'SOLID',
        color: { r: 0.88, g: 0.90, b: 0.92 },
        opacity: 1.0
      };
    }
    
    // For SOLID or other paints, return as is
    return fill;
  });
}

async function drawFigmaNode(nodeData, parent) {
  if (!nodeData) return;

  // Handle arrays recursively
  if (Array.isArray(nodeData)) {
    for (const child of nodeData) {
      await drawFigmaNode(child, parent);
    }
    return;
  }

  let newNode;

  // Create the appropriate Figma node based on type
  if (nodeData.type === 'RECTANGLE') {
    const rect = figma.createRectangle();
    rect.resize(nodeData.width || 100, nodeData.height || 100);
    newNode = rect;
  } else if (nodeData.type === 'TEXT') {
    const textNode = figma.createText();
    // Default to Inter Regular font (Figma built-in font)
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    textNode.characters = nodeData.characters || "";
    if (nodeData.fontSize) textNode.fontSize = nodeData.fontSize;
    newNode = textNode;
  } else if (nodeData.type === 'FRAME') {
    const frame = figma.createFrame();
    frame.resize(nodeData.width || 100, nodeData.height || 100);
    newNode = frame;
  }

  // If a node was successfully created, map visual styles
  if (newNode) {
    // 1. Position coordinates relative to parent frame
    newNode.x = nodeData.x || 0;
    newNode.y = nodeData.y || 0;
    
    // 2. Fills (colors, gradients, opacity)
    if (nodeData.fills && 'fills' in newNode) {
      newNode.fills = sanitizeFills(nodeData.fills);
    }
    
    // 3. Borders / Strokes
    if (nodeData.strokes && 'strokes' in newNode) {
      newNode.strokes = sanitizeFills(nodeData.strokes);
    }
    if (nodeData.strokeWeight !== undefined && 'strokeWeight' in newNode) {
      newNode.strokeWeight = nodeData.strokeWeight;
    }
    
    // 4. Effects (Shadows, Blurs)
    if (nodeData.effects && 'effects' in newNode) {
      newNode.effects = nodeData.effects;
    }
    
    // 5. Border Radii
    if (nodeData.topLeftRadius !== undefined && 'topLeftRadius' in newNode) {
      newNode.topLeftRadius = nodeData.topLeftRadius;
    }
    if (nodeData.topRightRadius !== undefined && 'topRightRadius' in newNode) {
      newNode.topRightRadius = nodeData.topRightRadius;
    }
    if (nodeData.bottomRightRadius !== undefined && 'bottomRightRadius' in newNode) {
      newNode.bottomRightRadius = nodeData.bottomRightRadius;
    }
    if (nodeData.bottomLeftRadius !== undefined && 'bottomLeftRadius' in newNode) {
      newNode.bottomLeftRadius = nodeData.bottomLeftRadius;
    }

    // 6. Add node to parent frame
    if ('appendChild' in parent) {
      parent.appendChild(newNode);
    }

    // 7. Render children recursively inside this node
    if (nodeData.children && nodeData.children.length > 0) {
      for (const child of nodeData.children) {
        await drawFigmaNode(child, newNode);
      }
    }
  }
}
