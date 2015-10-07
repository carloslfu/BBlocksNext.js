/** @jsx svgJSX */
import Rx from 'rx'
import {svg, h} from '@cycle/dom'
import _ from 'lodash'
import draggable from '../../gestures/draggable.js'

function svgJSX(tag, attrs, ...children) {
  return svg(tag, attrs, children)
}

export default function workspace(responses) {
  let normalProps$ = responses.props.getAll()

  // Default properties
  let props$ = normalProps$.map(props => {
    return {
      id: 'mainWorkspace',
      width: 800,
      height: 500,
      fill: '#fff',
      'stroke-opacity': 1,
      stroke: '#1b65a6',
      'stroke-width': 4,
      rx: 5,
      ry: 5,
      main: false,
      x: 0,
      y: 0,
      ...props
    }
  })

  let vtree$ = /*Rx.Observable.combineLatest(
    props$,
    responses.DOM.select(`#nestedWorkspace1`).events('dragging').startWith({ detail: {x: 0, y: 0} }),
    (props, drags) => {
      console.log({ x: drags.detail.x, y: drags.detail.y })
      if (props.children[0])
        props.children[0].properties = { ...props.children[0].properties, ...{ x: drags.detail.x, y: drags.detail.y } }
      return props
    }
  )*/
  props$.flatMap(props => {
    if (props.children.length > 0) {
      return Rx.Observable.combineLatest(
        Rx.Observable.just(props),
        responses.DOM.select(`#${props.children[0].properties.id}`).events('dragging').startWith(
          { 
            detail: {
              x: props.children[0].properties.x,
              y: props.children[0].properties.y
            }
          }
        ),
        (props, drags) => {
          //console.log({ x: drags.detail.x, y: drags.detail.y })
          props.children[0].properties = { ...props.children[0].properties, ...{ x: drags.detail.x, y: drags.detail.y } }
          return props
        }
      )
    } else
      return Rx.Observable.just(props)
  })
  // rendering
  .map(props => {
    //console.log(props)

    const svgPropsList = ['width', 'height']
    const svgProps = _.pick(props, (value, key) => (svgPropsList.indexOf(key) != -1))
    const containerPropsList = ['x', 'y']
    const containerProps = _.pick(props, (value, key) => (containerPropsList.indexOf(key) != -1))

    const mainBackgroundPropsList = ['width', 'height', 'fill']
    const mainBackgroundProps = _.pick(props, (value, key) => (mainBackgroundPropsList.indexOf(key) != -1))
    const nestedBackgroundPropsList = ['width', 'height', 'fill', 'stroke-opacity', 'stroke', 'stroke-width', 'rx', 'ry']
    const nestedBackgroundProps = _.pick(props, (value, key) => (nestedBackgroundPropsList.indexOf(key) != -1))

    // container type (nested or main)
    if (props.main) {
      return (
        <svg id={props.id} attributes={svgProps}
            style={{ border: '1px solid rgb(221, 221, 221)', overflow: 'hidden' }} >
          <rect id={props.id + '-background'} attributes={mainBackgroundProps} ></rect>
          {props.children}
        </svg>
      )
    } else {
      return (
        <g id={props.id} transform={`translate(${containerProps.x}, ${containerProps.y})`} >
          <rect id={props.id + '-background-border'} attributes={nestedBackgroundProps} ></rect>
          <svg attributes={svgProps} style={{ overflow: 'hidden' }} >
            <rect id={props.id + '-background'} attributes={nestedBackgroundProps} ></rect>
            {props.children}
          </svg>
        </g>
      )
    }
  })
  // event handling
  let dragging$ = props$.flatMap(props => {
    console.log(props)
    return Rx.Observable.combineLatest(
      Rx.Observable.just(props),
      draggable(responses.DOM.select(`#${props.id}-background`), props),
      (props, pos) => ({...pos})
    )
  })//.publish().refCount()
  
  return {
    DOM: vtree$,
    events: {
      dragging: dragging$
    }
  }
}
