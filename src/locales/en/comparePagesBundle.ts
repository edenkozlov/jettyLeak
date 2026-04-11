import alertLabs from './comparePages/alertLabs.json'
import flume from './comparePages/flume.json'
import flo from './comparePages/flo.json'
import hub from './comparePages/hub.json'
import phyn from './comparePages/phyn.json'
import shell from './comparePages/shell.json'
import waterAlert from './comparePages/waterAlert.json'
import wint from './comparePages/wint.json'

export default {
  ...shell,
  ...hub,
  ...flo,
  ...phyn,
  ...wint,
  ...alertLabs,
  ...waterAlert,
  ...flume,
}
