import React from 'react'
const squareStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  overflow: 'hidden',
}
export const Square = ({ black, bkgd, children }) => {
  return (
    <div
      style={{
        ...squareStyle,
        backgroundColor: 'white',
      }}
    >
        <div>
            {children}
            <img src={bkgd} alt="" style={{width: '100%', zIndex: 1}}/>
        </div>
    </div>
  )
}
