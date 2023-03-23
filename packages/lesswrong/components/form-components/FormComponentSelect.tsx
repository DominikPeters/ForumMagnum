import React from 'react';
import { registerComponent, Components } from '../../lib/vulcan-lib';

const FormComponentSelect = (props: any) => {
  const { form, options } = props
  const { MenuItem, MuiTextField } = Components;

  const selectOptions = options || (form && form.options)

  return <MuiTextField select {...props}>
    {selectOptions.map(option => (
      <MenuItem key={option.value} value={option.value}>
        {option.label}
      </MenuItem>
    ))}
  </MuiTextField>
}

const FormComponentSelectComponent = registerComponent("FormComponentSelect", FormComponentSelect);

declare global {
  interface ComponentTypes {
    FormComponentSelect: typeof FormComponentSelectComponent
  }
}
