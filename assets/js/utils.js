function uuid(len, radix) {
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    var uuid = [],
        i;
    radix = radix || chars.length;

    if (len) {
        // Compact form
        for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
    } else {
        // rfc4122, version 4 form
        var r;

        // rfc4122 requires these characters
        uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
        uuid[14] = '4';

        // Fill in random data.  At i==19 set the high bits of clock sequence as
        // per rfc4122, sec. 4.1.5
        for (i = 0; i < 36; i++) {
            if (!uuid[i]) {
                r = 0 | Math.random() * 16;
                uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
            }
        }
    }

    return uuid.join('');
}

highp_time = (function () {
    if (typeof window !== 'undefined') {
      // ???
      if (typeof window.performance !== 'undefined' && typeof performance.now !== 'undefined') {
        // support hrt
        return function () {
          return performance.now();
        };
      } else {
        // oh no..
        return function () {
          return (new Date()).getTime();
        };
      }
    } else {
      // node.js
      return function () {
        var diff = process.hrtime();
        return (diff[0] * 1e9 + diff[1]) / 1e6; // nano second -> ms
      };
    }
  })();

function genOrderId() {
    var now_time = highp_time();
    return b64_md5(uuid(32, 16) + now_time.toString());
}

function getSponserTier(mc_gross, corp) {
  const tiers = corp
      ? [128, 256, 1000, 3000, 6000, 10000]
      : [5, 25, 50, 100, 250, 500];

  let tier = 1;
  for (let i = 0; i < tiers.length; i++) {
      if (mc_gross < tiers[i]) break;
      tier = i + 2;
  }

  return tier;
}
