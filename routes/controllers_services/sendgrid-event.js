exports.POST = (req, res) => {
  // Set database
  const db = require("../../database-invites-test");
  const utils = require("../controllers_invites/utils");

  const processEvent = (event) => {
    const typeOfEvent = event.event;
    if (!typeOfEvent) return;
    switch (typeOfEvent) {
      case "bounce":
        console.log(event);
        break;
      case "dropped":
        console.log(event);
        break;
      case "spamreport":
        console.log(event);
        break;
      case "unsubscribe":
        console.log(event);
        break;
      case "group-unsubscribe":
        console.log(event);
        break;
    }
  };

  var events = req.body;

  events.forEach((event) => {
    processEvent(event);
  });

  return res.status(200).send();
};

/*
  [
    {
      email: 'example@test.com',
      timestamp: 1718084576,
      'smtp-id': '<14c5d75ce93.dfd.64b469@ismtpd-555>',
      event: 'processed',
      category: [ 'cat facts' ],
      sg_event_id: 'vO8iwKzSPUBsn-zcnRigaw==',
      sg_message_id: '14c5d75ce93.dfd.64b469.filter0001.16648.5515E0B88.0'
    },
    {
      email: 'example@test.com',
      timestamp: 1718084576,
      'smtp-id': '<14c5d75ce93.dfd.64b469@ismtpd-555>',
      event: 'deferred',
      category: [ 'cat facts' ],
      sg_event_id: '-BbdkG5IxLytaymvUgVMZA==',
      sg_message_id: '14c5d75ce93.dfd.64b469.filter0001.16648.5515E0B88.0',
      response: '400 try again later',
      attempt: '5'
    },
    {
      email: 'example@test.com',
      timestamp: 1718084576,
      'smtp-id': '<14c5d75ce93.dfd.64b469@ismtpd-555>',
      event: 'delivered',
      category: [ 'cat facts' ],
      sg_event_id: 'f-LI-FEIG0xcYnfWj3ml4g==',
      sg_message_id: '14c5d75ce93.dfd.64b469.filter0001.16648.5515E0B88.0',
      response: '250 OK'
    },
    {
      email: 'example@test.com',
      timestamp: 1718084576,
      'smtp-id': '<14c5d75ce93.dfd.64b469@ismtpd-555>',
      event: 'open',
      category: [ 'cat facts' ],
      sg_event_id: '7EAk97R8XR3cSGtzq23vNg==',
      sg_message_id: '14c5d75ce93.dfd.64b469.filter0001.16648.5515E0B88.0',
      useragent: 'Mozilla/4.0 (compatible; MSIE 6.1; Windows XP; .NET CLR 1.1.4322; .NET CLR 2.0.50727)',
      ip: '255.255.255.255'
    },
    {
      email: 'example@test.com',
      timestamp: 1718084576,
      'smtp-id': '<14c5d75ce93.dfd.64b469@ismtpd-555>',
      event: 'click',
      category: [ 'cat facts' ],
      sg_event_id: 'x8oO_PV-lAylHNotRhs6bQ==',
      sg_message_id: '14c5d75ce93.dfd.64b469.filter0001.16648.5515E0B88.0',
      useragent: 'Mozilla/4.0 (compatible; MSIE 6.1; Windows XP; .NET CLR 1.1.4322; .NET CLR 2.0.50727)',
      ip: '255.255.255.255',
      url: 'http://www.sendgrid.com/'
    },
    {
      email: 'example@test.com',
      timestamp: 1718084576,
      'smtp-id': '<14c5d75ce93.dfd.64b469@ismtpd-555>',
      event: 'bounce',
      category: [ 'cat facts' ],
      sg_event_id: 'ga5HarWwu11gbPm27VgAGA==',
      sg_message_id: '14c5d75ce93.dfd.64b469.filter0001.16648.5515E0B88.0',
      reason: '500 unknown recipient',
      status: '5.0.0'
    },
    {
      email: 'example@test.com',
      timestamp: 1718084576,
      'smtp-id': '<14c5d75ce93.dfd.64b469@ismtpd-555>',
      event: 'dropped',
      category: [ 'cat facts' ],
      sg_event_id: 'TBQxJF70jgB6aXlVzYSbGA==',
      sg_message_id: '14c5d75ce93.dfd.64b469.filter0001.16648.5515E0B88.0',
      reason: 'Bounced Address',
      status: '5.0.0'
    },
    {
      email: 'example@test.com',
      timestamp: 1718084576,
      'smtp-id': '<14c5d75ce93.dfd.64b469@ismtpd-555>',
      event: 'spamreport',
      category: [ 'cat facts' ],
      sg_event_id: 'd1zZQ66aEhI-R_9d1SSY6w==',
      sg_message_id: '14c5d75ce93.dfd.64b469.filter0001.16648.5515E0B88.0'
    },
    {
      email: 'example@test.com',
      timestamp: 1718084576,
      'smtp-id': '<14c5d75ce93.dfd.64b469@ismtpd-555>',
      event: 'unsubscribe',
      category: [ 'cat facts' ],
      sg_event_id: 'W5IevHO_huzcvjxyVYVzKg==',
      sg_message_id: '14c5d75ce93.dfd.64b469.filter0001.16648.5515E0B88.0'
    },
    {
      email: 'example@test.com',
      timestamp: 1718084576,
      'smtp-id': '<14c5d75ce93.dfd.64b469@ismtpd-555>',
      event: 'group_unsubscribe',
      category: [ 'cat facts' ],
      sg_event_id: 'L-knhY0FLhFPAsINr73YkQ==',
      sg_message_id: '14c5d75ce93.dfd.64b469.filter0001.16648.5515E0B88.0',
      useragent: 'Mozilla/4.0 (compatible; MSIE 6.1; Windows XP; .NET CLR 1.1.4322; .NET CLR 2.0.50727)',
      ip: '255.255.255.255',
      url: 'http://www.sendgrid.com/',
      asm_group_id: 10
    },
    {
      email: 'example@test.com',
      timestamp: 1718084576,
      'smtp-id': '<14c5d75ce93.dfd.64b469@ismtpd-555>',
      event: 'group_resubscribe',
      category: [ 'cat facts' ],
      sg_event_id: '6_v8DRnLVp3d7ez5WGo1Mg==',
      sg_message_id: '14c5d75ce93.dfd.64b469.filter0001.16648.5515E0B88.0',
      useragent: 'Mozilla/4.0 (compatible; MSIE 6.1; Windows XP; .NET CLR 1.1.4322; .NET CLR 2.0.50727)',
      ip: '255.255.255.255',
      url: 'http://www.sendgrid.com/',
      asm_group_id: 10
    }
  ]
*/
