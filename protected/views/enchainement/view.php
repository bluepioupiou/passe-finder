<?php
$this->breadcrumbs=array(
	'Enchainements'=>array('index'),
	$model->name,
);
$enchainementFavoris = EnchainementFavoris::Model()->findByAttributes(array('user_id'=>Yii::app()->user->id, 'enchainement_id'=>$model->id));

$this->menu=array(
	array('label'=>'Modifier', 'url'=>array('update', 'id'=>$model->id), 'visible'=>$model->userCreate_id==Yii::app()->user->id),
	array('label'=>'Supprimer', 'url'=>'#', 'linkOptions'=>array('submit'=>array('delete','id'=>$model->id),'confirm'=>'Are you sure you want to delete this item?'), 'visible'=>$model->userCreate_id==Yii::app()->user->id),	
	array('label'=>'Sauvegarder dans mes favoris', 'url'=>array('setFavoris', 'id'=>$model->id), 'visible'=>!$enchainementFavoris),
	array('label'=>'Enlever de mes favoris', 'url'=>array('unsetFavoris', 'id'=>$model->id), 'visible'=>$enchainementFavoris != null),
);
?>

<h1>Enchaînement <?php echo $model->name; ?></h1>

<?php $this->widget('zii.widgets.CDetailView', array(
	'data'=>$model,
	'attributes'=>array(
		array('name'=>'danse_id', 'value'=>$model->danse->name),
		array('name'=>'lesson_id', 'value'=>$model->lesson_id ? $model->lesson->name : "Pas de cours associé"),
		'dateEvent',
		'commentaire',
		array('name'=>'private', 'value'=>$model->private ? 'Oui' : 'Non'),
		array('name'=>'published', 'value'=>$model->published ? 'Oui' : 'Non'),
		'difficulty',
		array('name'=>'passeDifficultyAvg', 'value'=>number_format($model->passeDifficultyAvg,1))
	),
)); 
?>
<?php
	if ($model->videosCount == 0){
?>
	<br/><br/>
	<div id="passes"> Aucune vidéo liée à cet enchainement:
<?php 
	} else {
?>
<br/><br/>
	<div id="passes"> Les vidéos de cet enchainement (<?php echo $model->videosCount; ?>):
	</br><ol>
<?php	
	$i=0;
	foreach($model->videos as $video){
		$i++;
		$name = $video->description;
		if ($video->description == ""){
			$name = "Vidéo ".$i;
		}
		echo '<li>'.CHtml::link(CHtml::encode($name), array('video/view', 'id'=>$video->id)).'</li>';		
	}
}
?>
	</ol>
	</div>

<br/><br/>
	<div id="passes"> Les passes de cet enchainement (<?php echo $model->passesCount; ?>):
	</br><ol>
<?php
	foreach($model->enchainementPasses as $enchainementPasse){
		if ($enchainementPasse->passe_id != null){
			echo '<li>'.CHtml::link(CHtml::encode($enchainementPasse->passe->name), array('passe/view', 'id'=>$enchainementPasse->passe->id)).'</li>';
		} else {
			echo '<li>-->'.CHtml::link(CHtml::encode($enchainementPasse->position->name), array('position/view', 'id'=>$enchainementPasse->position->id)).'</li>';
		}
	}
?>
	</ol>
	</div>
