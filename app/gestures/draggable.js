import Rx from 'rx'
import {mouseToSvg} from '../helpers/utils.js'


let draggable = (element$, props) => {
	let targetId = ev => ev.target.attributes.id.value
	let down$ = element$.events('mousedown').map(
	  ev => ({ ...mouseToSvg(ev, ev.target.farthestViewportElement), ev })
	)
	/*.merge(
	  element$.events('touchstart')  // TODO: wraper for touch events
	)*/
	let up$ = element$.events('mouseup').map(
	  ev => ({ ...mouseToSvg(ev, ev.target.farthestViewportElement), ev })
	)
	/*.merge(
	  element$.events('touchend')  // TODO: wraper for touch events
	)*/
	let move$ = element$.events('mousemove')
	/*.merge(
	  element$.events('touchmove')  // TODO: wraper for touch events
	)*/

	let relPosition$ = Rx.Observable.combineLatest(
	  Rx.Observable.just(props),
	  down$,
	  (props, down) => {
	  	console.log(props)
		  return  ({
		    x: down.x - props.x,
		    y: down.y - props.y
		  })
	  }
	)
	/*let relPosition$ = down$.map(down => ({
	    x: down.x - position.x,
	    y: down.y - position.y
	  })
	)*/
	let drag$ = down$.map(function(e) {
		return move$.takeUntil(up$);
	})
	.concatAll().map(ev => ({ ...mouseToSvg(ev, ev.target.farthestViewportElement), ev }))
	/*
	let drag$ = move$.pausable(
	  down$.map(ev => true).merge(up$.map(ev => false))
	).map(ev => ({ ...mouseToSvg(ev, ev.target.farthestViewportElement), ev }))
	*/
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
/*
	down$.subscribe(down => {
	  down.ev.preventDefault()
	  console.log(targetId(down.ev) + ' - down')
	})

	up$.subscribe(up => {
	  up.ev.preventDefault()
	  console.log(targetId(up.ev) + ' - up')
	})

	/*move$.subscribe(ev => {
	  ev.preventDefault()
	  console.log(targetId(ev) + ' - move')
	})*/
/*
	relPosition$.subscribe(pos => {
	  console.log(pos)
	})
	drag$.subscribe(drag => {
	  console.log(drag)
	})
	dragRelative$.subscribe(x => {
	  console.log(x)
	})*/
	return dragRelative$
}

export default draggable