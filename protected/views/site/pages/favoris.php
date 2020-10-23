<?php
$this->breadcrumbs=array(
	'Mes favoris',
);
?>

<h1>Mes favoris</h1>

<br/><br/>
	<div id="passes"> Vos passes favorites (<?php echo Yii::app()->getModule('user')->user()->passesFavorisCount; ?>):
	</br><ol>
<?php
	foreach(Yii::app()->getModule('user')->user()->passesFavoris as $passe){
		echo '<li>'.CHtml::link(CHtml::encode($passe->name), array('passe/view', 'id'=>$passe->id)).'</li>';		
	}
?>
	</ol>
	</div>
	
<br/><br/>
	<div id="passes"> Vos enchainements favoris (<?php echo Yii::app()->getModule('user')->user()->enchainementsFavorisCount; ?>):
	</br><ol>
<?php
	foreach(Yii::app()->getModule('user')->user()->enchainementsFavoris as $enchainement){
		echo '<li>'.CHtml::link(CHtml::encode($enchainement->name), array('enchainement/view', 'id'=>$enchainement->id)).'</li>';		
	}
?>
	</ol>
	</div>
	
