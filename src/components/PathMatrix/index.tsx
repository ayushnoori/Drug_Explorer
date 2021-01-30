import { Card, Tooltip, Modal } from 'antd'
import { cropText, YES_ICON, NO_ICON, EDIT_ICON } from 'helpers';
import { getNodeColor } from 'helpers/color';
import React from 'react'

import {StateConsumer} from 'stores'
import { IState } from 'types';

interface Props {
    width:number,
    height:number,
    globalState: IState
}

interface State {
    expand: boolean[],
    isModalVisible: boolean
}

 class PathMatrix extends React.Component<Props, State>{
    TITLE_HEIGHT=36;
    MARGIN = 10;
    PADDING = 10;
    EDGE_LENGTH = 100;
    NODE_WIDTH = 130;
    NODE_HEIGHT = 25; 
    VERTICAL_GAP = 5

    constructor(prop:Props){
        super(prop)
        this.state={
            expand: [false, true, true, false],
            isModalVisible: false
        }

        this.showModal = this.showModal.bind(this)
        this.hideModal = this.hideModal.bind(this)
    }
    drawSummary(){
        let {EDGE_LENGTH, NODE_WIDTH, NODE_HEIGHT, VERTICAL_GAP} = this
        let {metaPaths, edgeThreshold} = this.props.globalState
        let summary = metaPaths
        .filter((metaPath)=>{
            return Math.min(...metaPath.edges.map(e=>e.score))>edgeThreshold
        })    
        .map((metaPath, pathIdx)=>{

            let {nodes, edges} = metaPath
            let svgNodes = nodes.map((node, nodeIdx)=>{
                let translate = `translate(${(EDGE_LENGTH+NODE_WIDTH)*nodeIdx}, ${pathIdx*(NODE_HEIGHT+VERTICAL_GAP)})`
                return (<g key={`node_${nodeIdx}`} transform={translate}>
                    <rect width={NODE_WIDTH} height={NODE_HEIGHT} fill={getNodeColor(node)} rx={this.NODE_HEIGHT/2}/>
                    <text textAnchor="middle" y={NODE_HEIGHT/2+6} x={NODE_WIDTH/2} fill='white'>{node}</text>
                </g>)
            })

            let svgEdges = edges.map( (edge, edgeIdx)=>{
                let translate = `translate(${NODE_WIDTH+(EDGE_LENGTH+NODE_WIDTH)*edgeIdx}, ${pathIdx*(NODE_HEIGHT+VERTICAL_GAP) + NODE_HEIGHT/2})`
                return <g key={`edge_${edgeIdx}`} transform={translate}  >
                    <line 
                    stroke="gray"
                    strokeWidth={edge.score * 10}
                    x1={0} y1={0} x2={EDGE_LENGTH} y2={0}
                    />
                    <text textAnchor="middle" x={EDGE_LENGTH/2} y={-5}>{edge.edgeInfo}</text>
                </g>
            })
            return [svgEdges, svgNodes]
        })
        return summary
    }
    expandType(idx:number){
        let {expand} = this.state
        if (idx<expand.length){
            expand[idx] = !expand[idx]
            this.setState({expand})
        }
    }
    getIconGroup(){
        
        return <g className='feedback' cursor="pointer">
            <g className="yes">
                <rect width={30} height={30} fill="white"/>
                <path d={YES_ICON} transform={`scale(0.04)`} />
            </g>
            <g className="no" transform={`translate(${30}, 0)`}>
                <rect width={30} height={30} fill="white"/>
                <path d={NO_ICON} transform={`scale(0.04)`}/>
            </g>
            <g className="edit" transform={`translate(${60}, 0)`} onClick={this.showModal}>
                <rect width={30} height={30} fill="white"/>
                <path d={EDIT_ICON} transform={`scale(0.04)`}/>
            </g>
        </g>
    }
    drawDummy(){
        let {EDGE_LENGTH, NODE_WIDTH, NODE_HEIGHT, VERTICAL_GAP} = this

        let {nodeNameDict, selectedDrug, selectedDisease, edgeTypes} = this.props.globalState

        const triangleRight = "M 9 17.879 V 6.707 A 1 1 0 0 1 10.707 6 l 5.586 5.586 a 1 1 0 0 1 0 1.414 l -5.586 5.586 A 1 1 0 0 1 9 17.879 Z",
        triangelBottom =  "M 6.414 9 h 11.172 a 1 1 0 0 1 0.707 1.707 l -5.586 5.586 a 1 1 0 0 1 -1.414 0 l -5.586 -5.586 A 1 1 0 0 1 6.414 9 Z"

        if (!selectedDisease) return
        if (!selectedDrug) return

        const ICON_WIDTH = 70

        let protoTypes:string[][] = [
            ['disease', 'gene/protein', 'gene/protein','gene/protein', 'drug'],
            ['disease', 'disease', 'effect/phenotype', 'drug'],
            ['disease', 'gene/protein', 'disease', 'gene/protein', 'drug'],
        ]

        let childrenNums = [5,2,2]
        
        let offsetY = 0
        let summary = protoTypes.map((type, pathIdx)=>{
            let nodes = type.map((node, nodeIdx)=>{
                let translate = `translate(${(EDGE_LENGTH+NODE_WIDTH)*nodeIdx}, ${0})`
                return (<g key={`node_${nodeIdx}`} transform={translate}>
                    <rect width={NODE_WIDTH} height={NODE_HEIGHT} fill={getNodeColor(node)} rx={this.NODE_HEIGHT/2}/>
                    <text textAnchor="middle" y={NODE_HEIGHT/2+6} x={NODE_WIDTH/2} fill='white'>{node}</text>
                </g>)
            })
            let edges = [...Array(type.length-1)].map((_, edgeIdx)=>{
                let translate = `translate(${NODE_WIDTH+(EDGE_LENGTH+NODE_WIDTH)*edgeIdx}, ${+ NODE_HEIGHT/2})`
                return <g key={`edge_${edgeIdx}`} transform={translate}  >
                    <line 
                    stroke="gray"
                    // strokeWidth={1+Math.random() * 8}
                    strokeWidth={2}
                    x1={0} y1={0} x2={EDGE_LENGTH} y2={0}
                    />
                </g>
            })
            let currentY = offsetY
            offsetY += (NODE_HEIGHT+VERTICAL_GAP)

            let numChildren = childrenNums[pathIdx], showChildren = this.state.expand[pathIdx]
            let children = [...Array(numChildren)].map((child, childIdx)=>{
                
                let nodes = type.map((node, nodeIdx)=>{
                    let nodeName:string 
                    if (nodeIdx===0) {
                        nodeName = nodeNameDict['disease'][selectedDisease!.replace('disease_','')]
                    // }else if (nodeIdx===numChildren-1) {
                    //     nodeName = nodeNameDict['drug'][selectedDrug!.replace('drug_','')]
                    }else {
                        let possibleNames = Object.values(nodeNameDict[node])
                        nodeName = possibleNames[Math.floor(Math.random()*possibleNames.length)]
                    }

                    let shortNodeName = cropText(nodeName, 14, NODE_WIDTH-10)

                    let translate = `translate(${(EDGE_LENGTH+NODE_WIDTH)*nodeIdx}, ${0})`
                    return (<Tooltip key={`node_${nodeIdx}`} title={shortNodeName.includes('.')?nodeName:''}>
                    <g  transform={translate} opacity={0.7}>
                        <rect width={NODE_WIDTH} height={NODE_HEIGHT} fill={getNodeColor(node)} />
                        <text textAnchor="middle" y={NODE_HEIGHT/2+6} x={NODE_WIDTH/2} fill='white'>{shortNodeName}</text>
                    </g>
                    </Tooltip>)
                })
                let edges = [...Array(type.length-1)].map((_, edgeIdx)=>{
                    let translate = `translate(${NODE_WIDTH+(EDGE_LENGTH+NODE_WIDTH)*edgeIdx}, ${+ NODE_HEIGHT/2})`

                    
                    let edgeInfos = Object.values(edgeTypes).filter(e=> e.nodes.sort().join() === type.slice(edgeIdx, edgeIdx+2).sort().join())
                    
                    

                    let edgeInfo = edgeInfos.length>0? edgeInfos[ Math.floor(edgeInfos.length*Math.random())].edgeInfo: ''

                    
                    return <g key={`edge_${edgeIdx}`} transform={translate}  >
                        <line 
                        stroke="lightgray"
                        strokeWidth={1+Math.random() * 8}
                        x1={0} y1={0} x2={EDGE_LENGTH} y2={0}
                        />
                        <text x={EDGE_LENGTH/2} y={3} textAnchor="middle">
                            {edgeInfo}
                        </text>
                    </g>
                })
                return <g key={childIdx} transform={`translate(${30 + ICON_WIDTH}, ${(NODE_HEIGHT+VERTICAL_GAP) * (1+childIdx)})`} >
                    {nodes}
                    {edges}
                    <g className='iconGroup' transform={`translate(${NODE_WIDTH*nodes.length + EDGE_LENGTH*edges.length + 20}, 0)`}>
                        {this.getIconGroup()}
                    </g>
                </g>
            })

            if (showChildren){
                offsetY += (NODE_HEIGHT+VERTICAL_GAP) * numChildren
            }

            
            return <g key={`prototype_${pathIdx}`} transform={`translate(${0}, ${currentY })`}>
                <g className="icon">
                    <text x={10} y={NODE_HEIGHT/2+6} textAnchor="middle">{numChildren}</text>
                    <path 
                        d={
                            showChildren?
                            // `M25 0 L${25+NODE_HEIGHT} 0 L${NODE_HEIGHT/2+25} ${NODE_HEIGHT} Z`
                            // :`M25 0 L25 ${NODE_HEIGHT} L${NODE_HEIGHT+25} ${NODE_HEIGHT/2} Z`
                            triangelBottom:triangleRight
                        }
                        transform={ `translate(${25}, 0)`}
                        fill="gray"
                        onClick={()=>this.expandType(pathIdx)}
                        cursor="pointer"
                    />
                    {showChildren?children: <g/>}
                    
                </g>
                <g className="prototype" transform={`translate(${ICON_WIDTH}, 0)`}>
                    {nodes} 
                    {edges}
                </g>
            </g>
        })
        return summary
    }
    showModal(){
        this.setState({isModalVisible: true})
    }
    hideModal(){
        this.setState({isModalVisible: false})
    }
    render(){
        let {width, height} = this.props, {isModalVisible} = this.state
        let svgWidth = width-2*this.PADDING-2*this.MARGIN, 
            svgOuterHeight = height - 2*this.PADDING-this.TITLE_HEIGHT,
            svgHeight = this.props.globalState.metaPaths.length * (this.NODE_HEIGHT+ this.VERTICAL_GAP)
        return <>
        <Card size='small' title='Path Matrix' 
            style={{width: width-2*this.MARGIN, height: height, margin: `0px ${this.MARGIN}px`}}
            bodyStyle={{padding:this.PADDING, height: svgOuterHeight, overflowY: "auto"}}
            headStyle={{height: this.TITLE_HEIGHT}}
        >
            <svg width={svgWidth} height={svgHeight}>
            {this.drawDummy()}
        </svg>
        </Card>
        <Modal title="Edit Explanation" visible={isModalVisible} onOk={this.hideModal} onCancel={this.hideModal} okText="Confirm" width={width} zIndex={1999}>
            <svg width={width}>

            </svg>
        </Modal>
        </>
    }
}

export default StateConsumer(PathMatrix)