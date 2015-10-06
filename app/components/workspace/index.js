/** @jsx svgJSX */
import {Rx} from 'rx'
import {svg, h} from '@cycle/dom'
import _ from 'lodash'
import {mouseToSvg} from '../../helpers/utils.js'

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
      ...props
    }
  })

// touch and mouse gestures ------------------------------------ TODO: isolate this
  let draggable = (element$, position$) => {
    let targetId = ev => ev.target.attributes.id.value
    let down$ = element$.events('mousedown').map(
      ev => mouseToSvg(ev, ev.target.farthestViewportElement)
    )
    /*.merge(
      element$.events('touchstart')  // TODO: wraper for touch events
    )*/
    let up$ = element$.events('mouseup').map(
      ev => mouseToSvg(ev, ev.target.farthestViewportElement)
    )
    /*.merge(
      element$.events('touchend')  // TODO: wraper for touch events
    )*/
    let move$ = element$.events('mousemove').map(
      ev => mouseToSvg(ev, ev.target.farthestViewportElement)
    )
    /*.merge(
      element$.events('touchmove')  // TODO: wraper for touch events
    )*/

    let relPosition$ = Rx.Observable.withLatestFrom(
      position$,
      down$,
      (position, down) => ({
        x: down.x - position.x,
        y: down.y - position.y
      })
    ).startWith({})

    let drag$ = move$.pausable(
      down$.map(ev => true).merge(up$.map(ev => false))
    ).map(ev => mouseToSvg(ev, ev.target.farthestViewportElement)).startWith({})

    let dragRelative$ = Rx.Observable.combineLatest(
      relPosition$,
      drag$,
      (relPosition, drag) => ({
        x: drag.x - relPosition.x,
        y: drag.y - relPosition.y,
        relPosition,
        drag,
      })
    )

    down$.subscribe(ev => {
      ev.preventDefault()
      console.log(targetId(ev) + ' - down')
    })

    up$.subscribe(ev => {
      ev.preventDefault()
      console.log(targetId(ev) + ' - up')
    })

    /*move$.subscribe(ev => {
      ev.preventDefault()
      console.log(targetId(ev) + ' - move')
    })*/
    props$.subscribe(pos => {
      console.log('pos: ' + pos)
    })
    relPosition$.subscribe(pos => {
      console.log('rel: ' + pos)
    })
    dragRelative$.subscribe(x => {
      console.log('drag: ' + x)
    })
    return down$.startWith({})// Relative$
  }

// ----------------------------------------

  let vtree$ = props$
  // event handling
  .flatMap(props =>
    Rx.Observable.combineLatest(
      Rx.Observable.just(props),
      draggable(responses.DOM.select(`#${props.id}-background`).startWith({}), { x: props.x, y: props.y }),
      (props, pos) => ({...props, ...pos})
    )
  )
  // rendering
  .map(props => {
    const svgPropsList = ['width', 'height']
    const svgProps = _.pick(props, (value, key) => (svgPropsList.indexOf(key) != -1))
    const containerPropsList = ['x', 'y']
    const containerProps = _.pick(props, (value, key) => (containerPropsList.indexOf(key) != -1))

    const mainBackgroundPropsList = ['width', 'height', 'fill']
    const mainBackgroundProps = _.pick(props, (value, key) => (mainBackgroundPropsList.indexOf(key) != -1))
    const nestedBackgroundPropsList = ['width', 'height', 'fill', 'stroke-opacity', 'stroke', 'stroke-width', 'rx', 'ry']
    const nestedBackgroundProps = _.pick(props, (value, key) => (nestedBackgroundPropsList.indexOf(key) != -1))

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
  
  
  return {
    DOM: vtree$,
  }
}
