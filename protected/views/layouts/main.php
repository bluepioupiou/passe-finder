<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
	<meta name="language" content="en" />

	<!-- blueprint CSS framework -->
	<link rel="stylesheet" type="text/css" href="<?php echo Yii::app()->request->baseUrl; ?>/css/screen.css" media="screen, projection" />
	<link rel="stylesheet" type="text/css" href="<?php echo Yii::app()->request->baseUrl; ?>/css/print.css" media="print" />
	<!--[if lt IE 8]>
	<link rel="stylesheet" type="text/css" href="<?php echo Yii::app()->request->baseUrl; ?>/css/ie.css" media="screen, projection" />
	<![endif]-->

	<link rel="stylesheet" type="text/css" href="<?php echo Yii::app()->request->baseUrl; ?>/css/main.css" />
	<link rel="stylesheet" type="text/css" href="<?php echo Yii::app()->request->baseUrl; ?>/css/form.css" />
    <link rel="stylesheet" type="text/css" href="<?php echo Yii::app()->request->baseUrl; ?>/css/passe_finder.css" />
	<link rel="shortcut icon" href="<?php echo Yii::app()->request->baseUrl; ?>/images/rock.jpg" />
	<title><?php echo CHtml::encode($this->pageTitle); ?> - Le site de référence du rock'n roll</title>
</head>
<?php
    date_default_timezone_set("Europe/Paris") 
?>
<body>

<div class="container" id="page">
    <div id="topnav">
		<div class="topnav_text">
            <?php
                if (Yii::app()->user->isGuest){
                    echo '<a href="'.Yii::app()->request->baseUrl.'/index.php'.Yii::app()->getModule('user')->loginUrl[0].'">'.Yii::app()->getModule('user')->t("Login").'</a>';
                    echo ' | <a href="'.Yii::app()->request->baseUrl.'/index.php'.Yii::app()->getModule('user')->registrationUrl[0].'">'.Yii::app()->getModule('user')->t("Register").'</a>';
                } else {
                    echo '<a href="'.Yii::app()->request->baseUrl.'/index.php'.Yii::app()->getModule('user')->logoutUrl[0].'">'.Yii::app()->getModule('user')->t("Logout").' ('.Yii::app()->user->name.')</a>';
                }   
            ?>
        </div>
    </div>
    
	<div id="header">
		<h1 id="logo">Passe Finder</h1>
		<div id="dancers"><img src="<?php echo Yii::app()->request->baseUrl;?>/images/dancers.png" width="112px" alt="" /></div>
		<div class="clear"></div>
	</div><!-- header -->
    <!-- DANSES
    <div id="dansenav">	
        <div class="dansenav_text">	
        <?php
            /*foreach(Danse::model()->findAll() as $danse){
                echo "<a href='#'>".$danse->name."</a> ";
            }*/
        ?>
        </div>
	</div>
	-->
	<div id="mainMbMenu">
		<?php $this->widget('application.extensions.mbmenu.MbMenu',array(
			'items'=>array(
				array(
					'label'=>'Accueil', 
					'url'=>array('/site/index')
				),
				array(
					'label'=>'Navigation',
					'items'=>array(
						array(
							'label'=>'Positions', 
							'url'=>array('/position/index')							
						),
						array(
							'label'=>'Alternatives', 
							'url'=>array('/alternative/index')							
						),
						array(
							'label'=>'Passes', 
							'url'=>array('/passe/index')							
						),
						array(
							'label'=>'Enchainements', 
							'url'=>array('/enchainement/index')							
						),
						array(
							'label'=>'Vidéos', 
							'url'=>array('/video/index')							
						),
						array(
							'label'=>'Ecoles', 
							'url'=>array('/school/index')							
						)
					)
				),
				array(
					'label'=>'Participer',
					'visible'=>!Yii::app()->user->isGuest,
					'items'=>array(
						array(
							'label'=>'Créer un enchainement', 
							'url'=>array('/enchainement/create')
						),
						array(
							'label'=>'Ajouter une vidéo', 
							'url'=>array('/video/create')
						),
						array(
							'label'=>'Proposer une position', 
							'url'=>array('/position/create')
						),
						array(
							'label'=>'Proposer une passe', 
							'url'=>array('/passe/create')
						),
						array(
							'label'=>'Inscrire une école', 
							'url'=>array('/school/create'),
							'visible'=>!Yii::app()->user->isGuest
						)						
					)
				),
				array(
					'label'=>'Administration',
					'visible'=>Yii::app()->user->isAdmin(),
					'items'=>array(
						array(
							'label'=>'Enchainements', 
							'url'=>array('/enchainement/admin')
						),
						array(
							'label'=>'Passes', 
							'url'=>array('/passe/admin')
						),
						array(
							'label'=>'Positions', 
							'url'=>array('/position/admin')
						),
						array(
							'label'=>'Changements', 
							'url'=>array('/change/admin')
						),
						array(
							'label'=>'Utilisateurs', 
							'url'=>array('/user/admin')
						),
						array(
							'label'=>'Danses', 
							'url'=>array('/danse/admin')
						),
						array(
							'label'=>'Ecoles', 
							'url'=>array('/school/admin')
						),
						array(
							'label'=>'Cours', 
							'url'=>array('/lesson/admin')
						),
						array(
							'label'=>'Vidéos', 
							'url'=>array('/video/admin')
						)
					)
				),  
				array(
					'label'=>'Mon compte',
					'visible'=>!Yii::app()->user->isGuest,
					'items'=>array(
						array(
							'label'=>Yii::app()->getModule('user')->t("Profile"), 
							'url'=>array(Yii::app()->getModule('user')->profileUrl[0])
						),	
						array(
							'label'=>"Gérer mes élèves", 
							'url'=>array('/userlesson/admin'),
							'visible'=>!Yii::app()->user->isGuest && Yii::app()->getModule('user')->user()->lessonsAsTeacherCount
						),
						array(
							'label'=>"Mes favoris", 
							'url'=>array('/site/page?view=favoris')							
						),
					)
				),
				array(
					'label'=>"Autres sites", 
					'url'=>array('/site/page?view=other')							
				),
			)
		)); ?>
	</div><!-- mainmenu -->
	<?php if(isset($this->breadcrumbs)):?>
		<?php $this->widget('zii.widgets.CBreadcrumbs', array(
			'links'=>$this->breadcrumbs,
		)); ?><!-- breadcrumbs -->
	<?php endif?>
	<?php echo $content; ?>
	<div class="clear"></div>
    
	<div id="footer">
        <div id="bottomnav">	
            <div class="bottomnav_text">	
				v3.1.1 | 
                <a href='<?php echo Yii::app()->request->baseUrl; ?>/index.php/site/page?view=about'>A propos</a> | 
                <a href='<?php echo Yii::app()->request->baseUrl; ?>/index.php/change/index'>Changements</a> | 
                <a href='<?php echo Yii::app()->request->baseUrl; ?>/index.php/site/contact'>Contact</a>
            </div>
        </div>
        <br/>
		Copyright &copy; <?php echo date('Y'); ?> by Blueracoon.<br/>
		All Rights Reserved.<br/>
		<?php echo Yii::powered(); ?>
	</div><!-- footer -->

</div><!-- page -->
<script type="text/javascript">
var gaJsHost = (("https:" == document.location.protocol) ? "https://ssl." : "http://www.");
document.write(unescape("%3Cscript src='" + gaJsHost + "google-analytics.com/ga.js' type='text/javascript'%3E%3C/script%3E"));
</script>
<script type="text/javascript">
try {
var pageTracker = _gat._getTracker("UA-11099436-1");
pageTracker._trackPageview();
} catch(err) {}</script>
</body>
</html>
