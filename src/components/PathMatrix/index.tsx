import { Card, Tooltip, Modal } from 'antd';
import {
  cropText,
  YES_ICON,
  NO_ICON,
  SEARCH_ICON,
  LOADING_ICON,
} from 'helpers';
import { getNodeColor, SELECTED_COLOR } from 'helpers/color';
import { ACTION_TYPES, selectDrug, toggleMetaPathHide } from 'stores/actions';
import { isAddDrug } from 'stores/reducer';
import React from 'react';

import { StateConsumer } from 'stores';
import { IMetaPath, IMetaPathSummary, IState, IDispatch } from 'types';
import * as d3 from 'd3';

import './index.css';

interface Props {
  width: number;
  height: number;
  globalState: IState;
  dispatch: IDispatch;
}

interface State {
  expand: boolean[];
  isModalVisible: boolean;
}

class PathMatrix extends React.Component<Props, State> {
  TITLE_HEIGHT = 0;
  MARGIN = 10;
  PADDING = 10;
  EDGE_LENGTH = 120;
  NODE_WIDTH = 130;
  NODE_HEIGHT = 25;
  VERTICAL_GAP = 5; // vertical gap between path
  GROUP_GAP = 10; // vertical gap between path groups
  COUNT_GAP = 5; // horizontal gap between count circles
  RADIUS = this.NODE_HEIGHT / 2; // max radius of the count circle
  HEAD_HEIGHT = 0; // height of the header ()
  ICON_GAP = 20; // width of the expand triangle icon
  offsetY = 0; // record the height of the expanded meta paths

  constructor(prop: Props) {
    super(prop);
    this.state = {
      expand: this.props.globalState.metaPathSummary.map((d) => true),
      isModalVisible: false,
    };

    this.showModal = this.showModal.bind(this);
    this.hideModal = this.hideModal.bind(this);
    this.filterMetaPathGroups = this.filterMetaPathGroups.bind(this);
  }
  toggleExpand(idx: number, flag: undefined | boolean) {
    let { expand } = this.state;
    if (flag === undefined) {
      expand[idx] = !expand[idx];
    } else {
      expand[idx] = flag;
    }
    this.setState({ expand });
  }

  isPathSelected(nodes: IMetaPath['nodes']) {
    const { selectedPathNodes } = this.props.globalState;
    const doesExist =
      selectedPathNodes.map((d) => d.nodeId).join() ===
        nodes.map((d) => d.nodeId).join() &&
      selectedPathNodes.map((d) => d.nodeType).join() ===
        nodes.map((d) => d.nodeType).join();
    return doesExist;
  }

  togglePathNodes(nodes: IMetaPath['nodes'], doesExist: boolean) {
    if (doesExist) {
      this.props.dispatch({
        type: ACTION_TYPES.Select_Path_Noes,
        payload: { selectedPathNodes: [] },
      });
    } else {
      this.props.dispatch({
        type: ACTION_TYPES.Select_Path_Noes,
        payload: { selectedPathNodes: nodes },
      });
    }
  }
  getMetaIconGroup(toggleHideFunc: (hide: boolean) => void) {
    return (
      <g
        className="feedback"
        cursor="pointer"
        style={{ fill: '#777' }}
        transform={`translate(5, 0)`}
      >
        <g
          className="yes"
          transform={`translate(${0 * this.ICON_GAP}, 0)`}
          onClick={() => toggleHideFunc(false)}
        >
          <rect width={this.ICON_GAP} height={this.ICON_GAP} fill="white" />
          <path d={YES_ICON} transform={`scale(0.03)`} />
        </g>
        <g
          className="no"
          transform={`translate(${1 * this.ICON_GAP}, 0)`}
          onClick={() => toggleHideFunc(true)}
        >
          <rect width={this.ICON_GAP} height={this.ICON_GAP} fill="white" />
          <path d={NO_ICON} transform={`scale(0.03)`} />
        </g>
      </g>
    );
  }
  getIconGroup(nodes: IMetaPath['nodes']) {
    const doesExist = this.isPathSelected(nodes);
    return (
      <g className="feedback" cursor="pointer" style={{ fill: '#777' }}>
        <g
          className="search"
          transform={`translate(0, 0)`}
          fill={doesExist ? 'red' : 'inherit'}
          onClick={() => this.togglePathNodes(nodes, doesExist)}
        >
          <rect
            width={this.ICON_GAP}
            height={this.ICON_GAP}
            fill="white"
            stroke="white"
          />
          <path d={SEARCH_ICON} transform={`scale(0.018)`} />
        </g>
        {/* <g className="yes" transform={`translate(${this.ICON_GAP}, 0)`}>
          <rect width={this.ICON_GAP} height={this.ICON_GAP} fill="white" />
          <path d={YES_ICON} transform={`scale(0.03)`} />
        </g>
        <g className="no" transform={`translate(${2 * this.ICON_GAP}, 0)`}>
          <rect width={this.ICON_GAP} height={this.ICON_GAP} fill="white" />
          <path d={NO_ICON} transform={`scale(0.03)`} />
        </g>
        <g
          className="edit"
          transform={`translate(${3 * this.ICON_GAP}, 0)`}
          onClick={this.showModal}
        >
          <rect width={this.ICON_GAP} height={this.ICON_GAP} fill="white" />
          <path d={EDIT_ICON} transform={`scale(0.03)`} />
        </g> */}
      </g>
    );
  }
  drawHeader() {
    const { drugPredictions, nodeNameDict } = this.props.globalState;
    const headerNames = drugPredictions.map(
      (drug) => nodeNameDict['drug'][drug.id]
    );
    headerNames.push('SUM');

    const header = headerNames.map((name, idx) => {
      const isSelected =
        idx > drugPredictions.length - 1
          ? false
          : drugPredictions[idx].selected;
      return (
        <text
          key={name}
          className={name}
          fill={isSelected ? SELECTED_COLOR : 'gray'}
          cursor="pointer"
          transform={`translate(
            ${idx * (this.RADIUS * 2 + this.COUNT_GAP) + this.RADIUS}, 
            ${this.HEAD_HEIGHT}) 
            rotate(-45)`}
          onClick={() => {
            if (idx < drugPredictions.length)
              this.onChangeDrug(drugPredictions[idx].id);
          }}
        >
          {name}
        </text>
      );
    });
    return header;
  }
  getCountWidth() {
    const width = this.RADIUS * 2 + this.COUNT_GAP + this.COUNT_GAP;
    return width;
  }
  drawSummary() {
    let { EDGE_LENGTH, NODE_WIDTH, NODE_HEIGHT, VERTICAL_GAP } = this;

    let { metaPathSummary, drugPredictions } = this.props.globalState;

    const COUNT_WIDTH = this.getCountWidth();

    let metaPathGroups = this.filterMetaPathGroups();
    const triangleRight =
        'M 9 17.879 V 6.707 A 1 1 0 0 1 10.707 6 l 5.586 5.586 a 1 1 0 0 1 0 1.414 l -5.586 5.586 A 1 1 0 0 1 9 17.879 Z',
      triangelBottom =
        'M 6.414 9 h 11.172 a 1 1 0 0 1 0.707 1.707 l -5.586 5.586 a 1 1 0 0 1 -1.414 0 l -5.586 -5.586 A 1 1 0 0 1 6.414 9 Z';

    const maxCount = Math.max(...metaPathSummary.map((d) => d.count).flat());
    const rScale = d3
      .scaleLinear()
      .range([this.RADIUS / 3, this.RADIUS])
      .domain([0, maxCount]);

    this.offsetY = 0;
    const allRows = [...metaPathSummary]
      .sort((a, b) => (a.hide ? 1 : 0) - (b.hide ? 1 : 0))
      .map((summary) => {
        let nodes = summary.nodeTypes.map((node, nodeIdx) => {
          let translate = `translate(${
            (EDGE_LENGTH + NODE_WIDTH) * nodeIdx
          }, ${0})`;
          return (
            <g key={`node_${nodeIdx}`} transform={translate}>
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                fill="white"
                strokeWidth="3"
                stroke={getNodeColor(node)}
                rx={this.NODE_HEIGHT / 2}
              />
              <text
                textAnchor="middle"
                y={NODE_HEIGHT / 2 + 6}
                x={NODE_WIDTH / 2}
                fill="black"
              >
                {node}
              </text>
            </g>
          );
        });
        let edges = [...Array(nodes.length - 1)].map((_, edgeIdx) => {
          let translate = `translate(${
            NODE_WIDTH + (EDGE_LENGTH + NODE_WIDTH) * edgeIdx
          }, ${+NODE_HEIGHT / 2})`;
          return (
            <g key={`edge_${edgeIdx}`} transform={translate}>
              <line
                stroke="lightgray"
                // strokeWidth={1+Math.random() * 8}
                strokeWidth={2}
                x1={0}
                y1={0}
                x2={EDGE_LENGTH}
                y2={0}
              />
            </g>
          );
        });
        let currentY = this.offsetY;
        this.offsetY += NODE_HEIGHT + VERTICAL_GAP;

        let differentChildren: JSX.Element[] = [];
        let childrenOffsetY = 0;
        const showChildren = this.state.expand[summary.idx];

        Object.keys(metaPathGroups).forEach((drugId) => {
          const metaPathGroup = metaPathGroups[drugId];
          const metaPaths =
            metaPathGroup.filter(
              (d) => d.nodeTypes.join('') === summary.nodeTypes.join('')
            )[0]?.metaPaths || [];

          const drugRank = drugPredictions.map((d) => d.id).indexOf(drugId);
          const children = this.drawChildrenPaths(metaPaths, drugRank);
          const childrenHeight =
            (NODE_HEIGHT + VERTICAL_GAP) * metaPaths.length;
          differentChildren.push(
            <g
              key={`drugRank: ${drugRank}`}
              className={`drugRank_${drugRank}`}
              transform={`translate(0, ${childrenOffsetY})`}
            >
              {children}
            </g>
          );

          childrenOffsetY += childrenHeight;
          if (showChildren) {
            this.offsetY += childrenHeight;
          }

          this.offsetY += this.GROUP_GAP;
        });

        const toggleHideFunc = (hide: boolean) => {
          toggleMetaPathHide(
            metaPathSummary,
            summary.idx,
            hide,
            this.props.dispatch
          );
          if (hide) {
            this.toggleExpand(summary.idx, false);
          }
        };

        return (
          <g
            key={`prototype_${summary.idx}`}
            transform={`translate(${0}, ${currentY})`}
            opacity={summary.hide ? 0.4 : 1}
          >
            <g className="metaCount">{this.drawMetaCount(summary, rScale)}</g>
            <g className="icon">
              <path
                d={showChildren ? triangelBottom : triangleRight}
                transform={`translate(${COUNT_WIDTH - 5}, 0)`}
                fill="gray"
                onClick={() => {
                  if (!summary.hide) this.toggleExpand(summary.idx, undefined);
                }}
                cursor="pointer"
              />
            </g>
            <g
              className="prototype"
              transform={`translate(${COUNT_WIDTH + this.ICON_GAP}, 0)`}
            >
              {nodes}
              {edges}
              <g
                className="iconGroup"
                transform={`translate(${
                  NODE_WIDTH * nodes.length + EDGE_LENGTH * edges.length
                }, 0)`}
              >
                {this.getMetaIconGroup(toggleHideFunc)}
              </g>
            </g>
            <g className="metapaths">
              {showChildren ? differentChildren : <g />}
            </g>
          </g>
        );
      });
    const content = (
      <g>
        <g
          className="rows"
          transform={`translate(${0}, ${this.PADDING + this.HEAD_HEIGHT})`}
        >
          {allRows}
        </g>
      </g>
    );
    return content;
  }

  onChangeDrug(selectedDrug: string) {
    const isAdd = isAddDrug(
      this.props.globalState.drugPredictions,
      selectedDrug
    );
    selectDrug(
      selectedDrug,
      this.props.globalState.selectedDisease,
      isAdd,
      this.props.dispatch
    );
  }

  componentDidUpdate(prevProps: Props) {
    if (
      // when disease changed, collapse all meta paths
      prevProps.globalState.selectedDisease !==
      this.props.globalState.selectedDisease
    ) {
      this.setState({
        expand: this.props.globalState.metaPathSummary.map((d) => true),
      });
    } else if (
      prevProps.globalState.drugPredictions.filter((d) => d.selected).length !==
      this.props.globalState.drugPredictions.filter((d) => d.selected).length
    ) {
      // update expended metapaths when selected drug changes
      const { metaPathSummary, drugPredictions } = this.props.globalState;

      const expandStatus = metaPathSummary.map(
        (d) =>
          d.count.reduce(
            (acc, cur, i) => acc + cur * (drugPredictions[i].selected ? 1 : 0),
            0
          ) > 0 && !d.hide
      );
      this.setState({ expand: expandStatus });
    }
  }

  drawMetaCount(
    summary: IMetaPathSummary,
    rScale: d3.ScaleLinear<number, number>
  ) {
    const { drugPredictions } = this.props.globalState;
    const { count, sum } = summary;
    const vis = count.map((num, idx) => {
      const isSelected = drugPredictions[idx].selected;
      const content =
        num === 0 ? (
          <line
            x1={0.5 * this.RADIUS}
            x2={1.5 * this.RADIUS}
            stroke={isSelected ? SELECTED_COLOR : 'lightgray'}
          />
        ) : (
          <>
            <circle
              r={rScale(num)}
              fill={isSelected ? SELECTED_COLOR : 'lightgray'}
              xlinkTitle={num.toString()}
              cx={this.RADIUS}
            />
            <text
              textAnchor="middle"
              transform={`
                translate(${this.RADIUS}, ${rScale(num) / 2}) 
              scale(${rScale(num) / this.RADIUS})
              `}
              fill={isSelected ? 'white' : 'black'}
            >
              {num}
            </text>
          </>
        );
      return (
        <g
          key={idx}
          className="count"
          transform={`translate(${idx * (2 * this.RADIUS + this.COUNT_GAP)}, ${
            this.NODE_HEIGHT / 2
          })`}
          cursor="pointer"
          onClick={() => this.onChangeDrug(drugPredictions[idx]['id'])}
        >
          {content}
        </g>
      );
    });
    return (
      <g className="metaCount" transform={`translate(${this.PADDING}, 0)`}>
        {vis}
        <g
          className="sum"
          transform={`translate(${
            count.length * (2 * this.RADIUS + this.COUNT_GAP)
          }, 0)`}
        ></g>
      </g>
    );
  }

  drawChildrenPaths(metaPaths: IMetaPath[], drugRank: number) {
    const { nodeNameDict, edgeTypes } = this.props.globalState;
    const COUNT_WIDTH = this.getCountWidth();
    const children = metaPaths.map((path, childIdx) => {
      const nodes = path.nodes.map((node, nodeIdx) => {
        const { nodeId, nodeType } = node;
        const nodeName = nodeNameDict[nodeType][nodeId];

        let prevNodeName = '';
        if (childIdx > 0) {
          const { nodeId: prevNodeId, nodeType: prevNodeType } = metaPaths[
            childIdx - 1
          ].nodes[nodeIdx];
          prevNodeName = nodeNameDict[prevNodeType][prevNodeId];
        }

        let shortNodeName =
          nodeName === prevNodeName
            ? '---'
            : cropText(nodeName, 14, this.NODE_WIDTH - 10) || 'undefined';

        let translate = `translate(${
          (this.EDGE_LENGTH + this.NODE_WIDTH) * nodeIdx
        }, ${0})`;

        return (
          <Tooltip
            key={`node_${nodeIdx}`}
            title={shortNodeName.includes('.') ? nodeName : ''}
          >
            <g transform={translate} className={`node_${nodeId}`}>
              <rect
                width={this.NODE_WIDTH}
                height={this.NODE_HEIGHT}
                fill={getNodeColor(nodeType)}
              />
              <text
                textAnchor="middle"
                y={this.NODE_HEIGHT / 2 + 6}
                x={this.NODE_WIDTH / 2}
                fill="white"
              >
                {shortNodeName}
              </text>
            </g>
          </Tooltip>
        );
      });
      const edges = path.edges.map((edge, edgeIdx) => {
        const translate = `translate(${
          this.NODE_WIDTH + (this.EDGE_LENGTH + this.NODE_WIDTH) * edgeIdx
        }, ${+this.NODE_HEIGHT / 2})`;

        let edgeName = edge.edgeInfo.replace('rev_', '');
        edgeName = edgeTypes[edgeName]?.edgeInfo || edgeName;
        edgeName = cropText(edgeName, 14, this.EDGE_LENGTH);
        return (
          <g key={`edge_${edgeIdx}`} transform={translate}>
            <line
              stroke="gray"
              strokeWidth={1 + edge.score * 0.7}
              x1={0}
              y1={this.NODE_HEIGHT / 4}
              x2={this.EDGE_LENGTH}
              y2={this.NODE_HEIGHT / 4}
            />
            <text x={this.EDGE_LENGTH / 2} y={0} textAnchor="middle">
              {edgeName}
            </text>
          </g>
        );
      });
      return (
        <g
          key={childIdx}
          transform={`translate(0, ${
            (this.NODE_HEIGHT + this.VERTICAL_GAP) * (1 + childIdx)
          })`}
        >
          <circle
            cx={
              drugRank * (2 * this.RADIUS + this.COUNT_GAP) +
              this.RADIUS +
              this.PADDING
            }
            cy={this.NODE_HEIGHT / 2}
            fill="gray"
            r={3}
          />
          <g transform={`translate(${COUNT_WIDTH + this.ICON_GAP}, 0)`}>
            {nodes}
            {edges}
            <g
              className="iconGroup"
              transform={`translate(${
                this.NODE_WIDTH * nodes.length + this.EDGE_LENGTH * edges.length
              }, 0)`}
            >
              {this.getIconGroup(path.nodes)}
            </g>
          </g>
        </g>
      );
    });
    return children;
  }
  showModal() {
    this.setState({ isModalVisible: true });
  }
  hideModal() {
    this.setState({ isModalVisible: false });
  }
  filterMetaPathGroups() {
    let { metaPathGroups, edgeThreshold } = this.props.globalState;
    let filteredMetaGroups: IState['metaPathGroups'] = {};
    Object.keys(metaPathGroups).forEach((k) => {
      filteredMetaGroups[k] = metaPathGroups[k].map((metaPathGroup) => {
        const metaPaths = metaPathGroup.metaPaths.filter((metaPath) =>
          metaPath.edges.every((e) => e.score > edgeThreshold)
        );
        return { ...metaPathGroup, metaPaths };
      });
    });

    Object.keys(filteredMetaGroups).forEach((k) => {
      filteredMetaGroups[k] = filteredMetaGroups[k].filter(
        (metaPathGroup) => metaPathGroup.metaPaths.length > 0
      );
    });

    return filteredMetaGroups;
  }
  render() {
    const { width, height } = this.props,
      { isModalVisible } = this.state;
    const {
      isDrugLoading,
      isAttentionLoading,
      metaPathSummary,
      selectedDisease,
    } = this.props.globalState;

    const svgWidth = Math.max(
      width - 2 * this.PADDING - 2 * this.MARGIN,
      this.getCountWidth() +
        this.ICON_GAP * 5 +
        this.NODE_WIDTH +
        (this.EDGE_LENGTH + this.NODE_WIDTH) * 4
    );

    const svgOuterHeight = height - 2 * this.PADDING - this.TITLE_HEIGHT,
      svgHeight = Math.max(
        this.offsetY + this.NODE_HEIGHT + this.VERTICAL_GAP + this.PADDING,
        svgOuterHeight
      );

    const reminderText = (
      <text x={width / 2} y={height / 2} fill="gray">
        {isDrugLoading || isAttentionLoading
          ? ''
          : selectedDisease
          ? 'There is no meta path'
          : 'Please select a disease first'}
      </text>
    );

    const metaPaths = this.drawSummary();
    const content = metaPathSummary.length === 0 ? reminderText : metaPaths;
    return (
      <>
        <Card
          size="small"
          style={{
            width: width - 2 * this.MARGIN,
            height: height,
            margin: `0px ${this.MARGIN}px`,
          }}
          bodyStyle={{
            padding: this.PADDING,
            height: svgOuterHeight,
            overflowY: 'auto',
          }}
        >
          <svg width={svgWidth} height={svgHeight}>
            {content}
            {/* overlap loading icon when it is loading */}
            {isDrugLoading ||
            (isAttentionLoading && this.state.expand.some((d) => d)) ? (
              <g
                transform={`translate(${svgWidth / 2}, ${svgOuterHeight / 2})`}
              >
                {LOADING_ICON}
              </g>
            ) : (
              <></>
            )}
          </svg>
        </Card>
        <Modal
          title="Edit Explanation"
          visible={isModalVisible}
          onOk={this.hideModal}
          onCancel={this.hideModal}
          okText="Confirm"
          width={width}
          zIndex={1999}
        >
          <svg width={width}></svg>
        </Modal>
      </>
    );
  }
}

export default StateConsumer(PathMatrix);
