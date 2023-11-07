/* eslint-env node */

const template = (variables, { tpl }) => {
  // SvgSettings -> SettingsIcon
  variables.componentName = `${variables.componentName.slice(3)}Icon`
  variables.exports[0].declaration.name = variables.componentName

  return tpl`
 ${variables.imports};
 ${variables.interfaces};
 const ${variables.componentName} = (${variables.props}) => (
   ${variables.jsx}
 );
  
 ${variables.exports};
 `
}

module.exports = template
