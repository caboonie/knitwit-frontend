'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = defaultCellRangeRenderer;

var _types = require('./types');

/**
 * Default implementation of cellRangeRenderer used by Grid.
 * This renderer supports cell-caching while the user is scrolling.
 */

function defaultCellRangeRenderer(_ref, changedCells, oldRenderedCells, allCellsChanged) {
  var cellCache = _ref.cellCache,
      cellRenderer = _ref.cellRenderer,
      columnSizeAndPositionManager = _ref.columnSizeAndPositionManager,
      columnStartIndex = _ref.columnStartIndex,
      columnStopIndex = _ref.columnStopIndex,
      deferredMeasurementCache = _ref.deferredMeasurementCache,
      horizontalOffsetAdjustment = _ref.horizontalOffsetAdjustment,
      isScrolling = _ref.isScrolling,
      isScrollingOptOut = _ref.isScrollingOptOut,
      parent = _ref.parent,
      rowSizeAndPositionManager = _ref.rowSizeAndPositionManager,
      rowStartIndex = _ref.rowStartIndex,
      rowStopIndex = _ref.rowStopIndex,
      styleCache = _ref.styleCache,
      verticalOffsetAdjustment = _ref.verticalOffsetAdjustment,
      visibleColumnIndices = _ref.visibleColumnIndices,
      visibleRowIndices = _ref.visibleRowIndices;

  // Browsers have native size limits for elements (eg Chrome 33M pixels, IE 1.5M pixes).
  // User cannot scroll beyond these size limitations.
  // In order to work around this, ScalingCellSizeAndPositionManager compresses offsets.
  // We should never cache styles for compressed offsets though as this can lead to bugs.
  // See issue #576 for more.
  var areOffsetsAdjusted = columnSizeAndPositionManager.areOffsetsAdjusted() || rowSizeAndPositionManager.areOffsetsAdjusted();
  var canCacheStyle = !isScrolling && !areOffsetsAdjusted;
  
  if (!allCellsChanged && !isScrolling) {
    // idea is that static cell cache will hold the list of rendered cells from 
    // for the changed cells, we need to render them, and then figure out where in the 
    // oldRenderedCells we need to do the overwriting.
    // index = 
    // console.log("defaultCellRenderer, changedCells",changedCells,oldRenderedCells)
    for (key of changedCells) {
      // console.log("key",key)
      const colLength = columnStopIndex-columnStartIndex+1
      var [rowIndex, columnIndex] = key.split("-");
      if (rowIndex>=rowStartIndex && rowIndex<=rowStopIndex && columnIndex>=columnStartIndex && columnIndex<=columnStopIndex){
        const index = (rowIndex-rowStartIndex)*colLength + (columnIndex-columnStartIndex)

        var rowDatum = rowSizeAndPositionManager.getSizeAndPositionOfCell(rowIndex);
        var columnDatum = columnSizeAndPositionManager.getSizeAndPositionOfCell(columnIndex);

        var isVisible = columnIndex >= visibleColumnIndices.start && columnIndex <= visibleColumnIndices.stop && rowIndex >= visibleRowIndices.start && rowIndex <= visibleRowIndices.stop;

        // Cache style objects so shallow-compare doesn't re-render unnecessarily.
        if (canCacheStyle && styleCache[key]) {
          style = styleCache[key];
        } else {
          // In deferred mode, cells will be initially rendered before we know their size.
          // Don't interfere with CellMeasurer's measurements by setting an invalid size.
          if (deferredMeasurementCache && !deferredMeasurementCache.has(rowIndex, columnIndex)) {
            // Position not-yet-measured cells at top/left 0,0,
            // And give them width/height of 'auto' so they can grow larger than the parent Grid if necessary.
            // Positioning them further to the right/bottom influences their measured size.
            style = {
              height: 'auto',
              left: 0,
              position: 'absolute',
              top: 0,
              width: 'auto'
            };
          } else {
            style = {
              height: rowDatum.size,
              left: columnDatum.offset + horizontalOffsetAdjustment,
              position: 'absolute',
              top: rowDatum.offset + verticalOffsetAdjustment,
              width: columnDatum.size
            };

            styleCache[key] = style;
          }
        }


        var cellRendererParams = {
          columnIndex: columnIndex,
          isScrolling: isScrolling,
          isVisible: isVisible,
          key: key,
          parent: parent,
          rowIndex: rowIndex,
          style: style
        };

        oldRenderedCells[index] = cellRenderer(cellRendererParams);
      }
    }
    
  } else {

    oldRenderedCells = [];


    

    for (var rowIndex = rowStartIndex; rowIndex <= rowStopIndex; rowIndex++) {
      var rowDatum = rowSizeAndPositionManager.getSizeAndPositionOfCell(rowIndex);

      for (var columnIndex = columnStartIndex; columnIndex <= columnStopIndex; columnIndex++) {
        var columnDatum = columnSizeAndPositionManager.getSizeAndPositionOfCell(columnIndex);
        var isVisible = columnIndex >= visibleColumnIndices.start && columnIndex <= visibleColumnIndices.stop && rowIndex >= visibleRowIndices.start && rowIndex <= visibleRowIndices.stop;
        var key = rowIndex + '-' + columnIndex;
        var style = void 0;

        // Cache style objects so shallow-compare doesn't re-render unnecessarily.
        if (canCacheStyle && styleCache[key]) {
          style = styleCache[key];
        } else {
          // In deferred mode, cells will be initially rendered before we know their size.
          // Don't interfere with CellMeasurer's measurements by setting an invalid size.
          if (deferredMeasurementCache && !deferredMeasurementCache.has(rowIndex, columnIndex)) {
            // Position not-yet-measured cells at top/left 0,0,
            // And give them width/height of 'auto' so they can grow larger than the parent Grid if necessary.
            // Positioning them further to the right/bottom influences their measured size.
            style = {
              height: 'auto',
              left: 0,
              position: 'absolute',
              top: 0,
              width: 'auto'
            };
          } else {
            style = {
              height: rowDatum.size,
              left: columnDatum.offset + horizontalOffsetAdjustment,
              position: 'absolute',
              top: rowDatum.offset + verticalOffsetAdjustment,
              width: columnDatum.size
            };

            styleCache[key] = style;
          }
        }

        

        var renderedCell = void 0;

        // Avoid re-creating cells while scrolling.
        // This can lead to the same cell being created many times and can cause performance issues for "heavy" cells.
        // If a scroll is in progress- cache and reuse cells.
        // This cache will be thrown away once scrolling completes.
        // However if we are scaling scroll positions and sizes, we should also avoid caching.
        // This is because the offset changes slightly as scroll position changes and caching leads to stale values.
        // For more info refer to issue #395
        //
        // If isScrollingOptOut is specified, we always cache cells.
        // For more info refer to issue #1028

        var cellRendererParams = {
          columnIndex: columnIndex,
          isScrolling: isScrolling,
          isVisible: isVisible,
          key: key,
          parent: parent,
          rowIndex: rowIndex,
          style: style
        };
        if ((isScrollingOptOut || isScrolling) && !horizontalOffsetAdjustment && !verticalOffsetAdjustment) {
            if (!cellCache[key]) {
            cellCache[key] = cellRenderer(cellRendererParams);
            }

            renderedCell = cellCache[key];

            // If the user is no longer scrolling, don't cache cells.
            // This makes dynamic cell content difficult for users and would also lead to a heavier memory footprint.
        } else {
          renderedCell = cellRenderer(cellRendererParams);
        }
        


        if (renderedCell == null || renderedCell === false) {
          continue;
        }

        if (process.env.NODE_ENV !== 'production') {
          warnAboutMissingStyle(parent, renderedCell);
        }

        oldRenderedCells.push(renderedCell);
      }
    } 
  }
  return [oldRenderedCells, _ref.scrollTop, _ref.scrollLeft]
}

function warnAboutMissingStyle(parent, renderedCell) {
  if (process.env.NODE_ENV !== 'production') {
    if (renderedCell) {
      // If the direct child is a CellMeasurer, then we should check its child
      // See issue #611
      if (renderedCell.type && renderedCell.type.__internalCellMeasurerFlag) {
        renderedCell = renderedCell.props.children;
      }

      if (renderedCell && renderedCell.props && renderedCell.props.style === undefined && parent.__warnedAboutMissingStyle !== true) {
        parent.__warnedAboutMissingStyle = true;

        console.warn('Rendered cell should include style property for positioning.');
      }
    }
  }
}