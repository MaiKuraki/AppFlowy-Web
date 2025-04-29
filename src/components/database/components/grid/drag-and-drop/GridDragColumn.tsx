import DropColumnIndicator from '@/components/database/components/grid/drag-and-drop/DropColumnIndicator';
import {
  GridDragState,
  ItemState,
  useGridDragContext,
} from '@/components/database/components/grid/drag-and-drop/GridDragContext';
import { RenderColumn } from '@/components/database/components/grid/grid-column';
import { cn } from '@/lib/utils';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const idleState: ItemState = { type: GridDragState.IDLE };
const draggingState: ItemState = { type: GridDragState.DRAGGING };

function GridDragColumn ({ columnIndex, column, children }: {
  column: RenderColumn,
  children: React.ReactNode,
  columnIndex: number
}) {
  const { registerColumn, columnInstanceId: instanceId } = useGridDragContext();
  const innerRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<ItemState>(idleState);
  const { fieldId } = column;

  useEffect(() => {
    const element = innerRef.current;
    const dragHandle = dragHandleRef.current;

    if (!element || !dragHandle || !fieldId) return;

    const data = {
      instanceId,
      fieldId,
      index: columnIndex,
    };

    return combine(
      registerColumn({ fieldId, element }),
      draggable({
        element,
        dragHandle,
        getInitialData: () => data,
        onGenerateDragPreview ({ nativeSetDragImage }) {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: pointerOutsideOfPreview({
              x: '16px',
              y: '8px',
            }),
            render ({ container }) {
              setState({ type: GridDragState.PREVIEW, container });
              return () => setState(draggingState);
            },
          });
        },
        onDragStart () {
          setState(draggingState);
        },
        onDrop () {
          setState(idleState);
        },
      }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) =>
          source.data &&
          source.data.instanceId === instanceId &&
          source.data.fieldId !== fieldId,
        getIsSticky: () => true,
        getData ({ input }) {
          return attachClosestEdge(data, {
            element,
            input,
            allowedEdges: ['left', 'right'],
          });
        },
        onDrag ({ self }) {
          const closestEdge = extractClosestEdge(self.data);

          setState((current) => {
            if (current.type === GridDragState.IS_OVER && current.closestEdge === closestEdge) {
              return current;
            }

            return { type: GridDragState.IS_OVER, closestEdge };
          });
        },
        onDragLeave () {
          setState(idleState);
        },
        onDrop () {
          setState(idleState);
        },
      }),
    );
  }, [columnIndex, fieldId, instanceId, registerColumn]);

  return (
    <div
      ref={innerRef}
      className={cn(
        'relative flex w-full h-full',
        state.type === GridDragState.DRAGGING && 'opacity-40',
      )}
    >
      <div
        className={'w-full h-full'}
        ref={dragHandleRef}
      >
        {children}
        {state.type === GridDragState.IS_OVER && state.closestEdge && (
          <DropColumnIndicator
            edge={state.closestEdge}
          />
        )}
      </div>
      {state.type === GridDragState.PREVIEW && createPortal(
        <div className={'flex'}>
          {children}
        </div>,
        state.container,
      )}
    </div>
  );
}

export default GridDragColumn;