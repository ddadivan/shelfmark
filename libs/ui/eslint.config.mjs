import baseConfig from '../../eslint.config.mjs';
import angularConfig from '../../eslint.angular.mjs';

export default [...baseConfig, ...angularConfig({ prefix: 'ui' })];
