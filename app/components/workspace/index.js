/** @jsx svgJSX */
import {Rx} from '@cycle/core'
import {svg, h} from '@cycle/dom'
import _ from 'lodash'

function svgJSX(tag, attrs, ...children) {
  return svg(tag, attrs, children)
}

export default function workspace(responses) {
  const props$ = responses.props.get('*');

  const vtree$ = props$.map(props => {
    const privateProps = ['children', 'nested']
    const svgProps = _.pick(props, (value, key) => (privateProps.indexOf(key) == -1))
    return (
      <svg attributes={svgProps} style={{ border: '1px solid rgb(221, 221, 221)' }} >
        {props.children}
      </svg>
    )
  })

  return {
    DOM: vtree$,
  }
}
