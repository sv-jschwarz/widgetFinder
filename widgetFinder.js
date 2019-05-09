/**
 * Widget Finder
 * 
 * Returns a list of page url paths where a particular widget can be found.
 * 
 * @version 1.0
 * @author sv-cmswo
 * @date 05/08/2019
 **/

let arrayLib = require("@sv/arrayLib");
let objectLib = require("@sv/objectLib");

(async function main() {
	const filter =  {
		"root.instance.type" : "widget", // change to "panel" to find panels
		"root.instance.name" : {
			$in : [
				'plugins_listings_detail',
				// 'plugins_core_textbox',
			]
		}
	};

	let navItems = await getNavItems().catch(errorFn);
	let navVersions = await getNavItemVersions(navItems).catch(errorFn);
	let urls = await findWidgets(navItems, navVersions, filter);

	cb(null, urls);
})();

function getNavItems() {
	return new Promise((resolve, reject) => {
		site.plugins.nav.apis.navItems.find({ type : "page", active : true, published : true, site_name : "primary" }, (err, result) => {
			if (err) { reject(err); }
			resolve(result);
		});
	});
}

function getNavItemVersions(navItems) {
	return new Promise((resolve, reject) => {
		site.plugins.nav.apis.navItemVersions.find({ _id : { $in : navItems.map(n => n.version_id) } }, { fields : { civid : 1, nav_id : 1 } }, (err, result) => {
			if (err) { reject(err); }
			resolve(result);
		});
	});
}

async function findWidgets(navItems, navVersions, filter) {
	let mappedNavs = await Promise.all(navVersions.map(n => checkForWidget(n, filter))).catch(errorFn);
	let foundList = navVersions.filter(n => mappedNavs.filter(o => o.nav_id === n.nav_id && o.found).length > 0);

	const index = arrayLib.index(navItems, "_id");
	return foundList.map(n => index[n.nav_id].folderHref);
}

function checkForWidget(version, filter) {
	return new Promise((resolve, reject) => {
		site.plugins.nav._getAllCiv({ civid : version.civid }, (err, civs) => {
			if (err) { reject(err); }

			const found = civs.some(function(val) {
				const testcase = objectLib.deepMap(val, {
					valid : {
						conditional : [
							{ filter : filter, result : { value : true } },
							{ result : { value : false } }
						]
					}
				});
				return testcase.valid;
			});

			resolve({
				nav_id: version.nav_id,
				found: found
			});
		});
	});
}

function errorFn(err) {
	console.log('[Error]', err);
	return err;
}
