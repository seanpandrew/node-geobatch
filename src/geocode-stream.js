import stream from 'stream';

/**
 * A streaming object for the geocode
 * @param {Object} geocoder The geocoder
 */
export default class GeocodeStream extends stream.Transform {
  /**
   * Constructs a geocodeStream.
   * @param  {Object} geocoder A geocoder.
   * @param  {Object} stats A statistics object.
   * @param  {Function} accessor An accessor function that returns the address
   *                             from the data item. The default returns the
   *                             data item directly.
   */
  constructor(geocoder, stats, accessor = address => address) {
    super({objectMode: true});

    this.geocoder = geocoder;
    this.stats = stats;
    this.accessor = accessor;
  }

  /**
   * The _transform function for the stream.
   * @param {String}   input The address to geocode
   * @param {String}   encoding The encoding
   * @param {Function} done The done callback function
   */
  _transform(input, encoding, done) { // eslint-disable-line
    this.geocoder.geocodeAddress(this.accessor(input))
      .then(results => {
        let data = this.getMetaInfo(input);
        data.result = results[0];
        data.results = results;
        data.location = results[0].geometry.location;
        this.push(data);
        done();
      })
      .catch(error => {
        let data = this.getMetaInfo(input);

        data.error = error.message;
        this.push(data);
        done();
      });
  }

  /**
   * Get the result meta information
   * @param {String} input The input
   * @return {Object} The meta information
   */
  getMetaInfo(input) {
    this.stats.current++;

    let metaInfo = {
      error: null,
      address: this.accessor(input),
      input: input,
      location: {},
      result: {},
      current: this.stats.current
    };

    if (this.stats.hasOwnProperty('total')) {
      const now = new Date(),
        ratio = this.stats.current / this.stats.total;

      Object.assign(metaInfo, {
        total: this.stats.total,
        pending: this.stats.total - this.stats.current,
        percent: ratio * 100,
        estimatedDuration: Math.round((now - this.stats.startTime) / ratio)
      });
    }
    return metaInfo;
  }
}