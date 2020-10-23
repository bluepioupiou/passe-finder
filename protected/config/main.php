<?php

// uncomment the following to define a path alias
// Yii::setPathOfAlias('local','path/to/local-folder');
ob_start('My_OB');
function My_OB($str, $flags)
{
    //remove UTF-8 BOM
    $str = preg_replace("/\xef\xbb\xbf/","",$str);
    
    return $str;
}
Yii::setPathOfAlias('editable', dirname(__FILE__).'/../extensions/x-editable');
Yii::setPathOfAlias('bootstrap', dirname(__FILE__).'/../extensions/bootstrap');
// This is the main Web application configuration. Any writable
// CWebApplication properties can be configured here.
return array(
	'basePath'=>dirname(__FILE__).DIRECTORY_SEPARATOR.'..',
	'name'=>'Passe Finder',
    'language' => 'fr',
    //'theme'=>'shadow_dancer',
	// preloading 'log' component
	'preload'=>array('log'),	

	'modules'=>array(       
		'user'=>array(
            # encrypting method (php hash function)
            'hash' => 'md5', 
            # send activation email
            'sendActivationMail' => true, 
            # allow access for non-activated users
            'loginNotActiv' => false, 
            # activate user on registration (only sendActivationMail = false)
            'activeAfterRegister' => false, 
            # automatically login from registration
            'autoLogin' => true, 
            # registration path
            'registrationUrl' => array('/user/registration'), 
            # recovery password path
            'recoveryUrl' => array('/user/recovery'), 
            # login form path
            'loginUrl' => array('/user/login'), 
            # page after login
            'returnUrl' => array('/user/profile'), 
            # page after logout
            'returnLogoutUrl' => array('/user/login'),			
            'tableUsers' => 'account',
            'tableProfiles' => 'profile',
            'tableProfileFields' => 'profile_fields'       
        ),
		// uncomment the following to enable the Gii tool		
		'gii'=>array(
			'class'=>'system.gii.GiiModule',
			'password'=>'myGiiPassword',
		 	// If removed, Gii defaults to localhost only. Edit carefully to taste.
			'ipFilters'=>array('127.0.0.1','::1', '82.230.225.182'),
			'generatorPaths' => array(
				'ext.giix-core', // giix generators
			),
		),
		
	),
    
    // autoloading model and component classes
    'import'=>array(
        'application.models.*',
        'application.components.*',
		'application.modules.user.models.*',
        'application.modules.user.components.*',
		'ext.giix-components.*',	
		'editable.*' //easy include of editable classes			
    ), 
    

	// application components
	'components'=>array(		
        // uncomment the following to enable URLs in path-format
		
		'urlManager'=>array(
			'urlFormat'=>'path',
			'rules'=>array(
				'<controller:\w+>/<id:\d+>'=>'<controller>/view',
				'<controller:\w+>/<action:\w+>/<id:\d+>'=>'<controller>/<action>',
				'<controller:\w+>/<action:\w+>'=>'<controller>/<action>',
			),
		),	
		'editable' => array(
            'class'     => 'editable.EditableConfig',
            'form'      => 'bootstrap',        //form style: 'bootstrap', 'jqueryui', 'plain' 
            'mode'      => 'popup',            //mode: 'popup' or 'inline'  
            'defaults'  => array(              //default settings for all editable elements
               'emptytext' => 'Click to edit'
            )
        ),     	
		'bootstrap'=>array(
            'class'=>'bootstrap.components.Bootstrap',
        ),			
        'db'=>array(
            'class'=>'CDbConnection',
            'connectionString'=>'mysql:host=mysql5-62.90;dbname=passefinder_db',
			'username'=>'passefinder_db',
            'password'=>'PxrzryNC',
            'emulatePrepare'=>true,  
			'charset' => 'utf8'
        ), 
		'authManager'=>array(
            'class'=>'RDbAuthManager',
            'connectionID'=>'db',
        ),
		'errorHandler'=>array(
			// use 'site/error' action to display errors
            'errorAction'=>'site/error',
        ),
		'user'=>array(
            // enable cookie-based authentication
            'class' => 'WebUser',
            'allowAutoLogin'=>true,
            'loginUrl' => array('/user/login'),
        ),
		'email'=>array(
    	    'class'=>'application.extensions.email.Email',
	        'delivery'=>'php', //Will use the php mailing function.  
	        //May also be set to 'debug' to instead dump the contents of the email into the view
	    ),
		/*,
		'log'=>array(
			'class'=>'CLogRouter',
			'routes'=>array(
				array(
					'class'=>'CFileLogRoute',
					'levels'=>'error, warning',
				),
				array (
					'class' => 'CWebLogRoute'
				)
			),
		),*/
	),

	// application-level parameters that can be accessed
	// using Yii::app()->params['paramName']
	'params'=>array(
		// this is used in contact page
		'adminEmail'=>'passe-finder@gmail.com',
	),
);
?>